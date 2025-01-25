import express, { Router, Express, Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Database as db } from './db';
import { UserModel } from '@wb/shared-types';
import { runTransformation, TransformationResult } from './llm';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const app: Express = express();
const router = Router();
const port = 3000;

const allowedOrigin = process.env.NODE_ENV == 'development' ? 'http://localhost:5173' : 'https://canvo.app';
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length == 0) {
  throw new Error('Cannot start server: JWT_SECRET is not set');
}
const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

app.use(cookieParser());

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: "GET, POST, OPTIONS, PUT, DELETE",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://www.canvo.app'],
      connectSrc: ["'self'", 'https://www.canvo.app']
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());

////////////////////////////////////////////////////////////
// Serve React App
////////////////////////////////////////////////////////////
if (process.env.NODE_ENV == 'development') {
  app.get('/', (req: Request, res: Response) => {
    res.status(404).send(`
      <html>
        <body>
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            404
          </div>
          <div style="font-size: 20px; margin-bottom: 10px;">
            You are running the backend server in development mode.
            It will not serve the static site files in development mode.
            Run the frontend's own development server and request the site from there.
          </div>
          <div>
            <a href="http://localhost:5173">Frontend Development Server</a>
          </div>
        </body>
      </html>
    `);
  });
} else {
  const buildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(buildPath));

  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

////////////////////////////////////////////////////////////
// User Authentication
////////////////////////////////////////////////////////////

async function requestContainsValidSessionToken(req: Request): Promise<{ isValid: boolean, userEmail: string | null }> {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) {
    return { isValid: false, userEmail: null };
  }

  try {
    const session = await db.getSession(sessionToken);

    if (session && new Date(session.session_expiration) > new Date()) {
      return { isValid: true, userEmail: session.user_email };
    } else {
      return { isValid: false, userEmail: null };
    }
  } catch (error) {
    console.error('Error checking session token:', error);
    return { isValid: false, userEmail: null };
  }
}

// Create session cookie and store it in the database
async function createSessionToken(res: Response, email: string) {
  const salt = uuidv4();
  const sessionToken = jwt.sign({ email: email, salt: salt }, jwtSecret, { expiresIn: '30d' });
  // Javascript uses milliseconds for dates
  const sessionExpiration = new Date(Date.now() + thirtyDaysInSeconds * 1000);
  await db.insertSession(sessionToken, email, sessionExpiration);
  return sessionToken;
}

// Validate an invite code and create a session cookie if it is valid
router.post('/auth/invite', async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "No email or invite code provided" });
  }

  try {
    const invite = await db.getInvite(code);

    if (!invite) {
      return res.status(404).json({ error: "Invite code not found" });
    }

    if (invite.user_email !== email) {
      return res.status(401).json({ error: "Invite code does not match email" });
    }

    await db.insertUser(email);

    // Create a session cookie and return it to the user
    const sessionToken = await createSessionToken(res, email);
    // Javascript uses milliseconds for dates, so express.js uses milliseconds for the maxAge
    res.cookie('session_token', sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: thirtyDaysInSeconds * 1000 });

    return res.json({
      status: "success",
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

async function getUserFromSessionToken(req: Request): Promise<UserModel | null> {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) {
    return null;
  }

  const session = await db.getSession(sessionToken);
  if (!session) {
    return null;
  }

  return await db.getUser(session.user_email);
}

// Check if the session token is valid
router.get('/auth/check', async (req: Request, res: Response) => {
  const { isValid } = await requestContainsValidSessionToken(req);

  return res.json({
    status: isValid ? "success" : "failed",
  });
});

////////////////////////////////////////////////////////////
// Database Functions at /api/*
////////////////////////////////////////////////////////////

// Middleware to guard the /api/* routes
app.use('/api', async (req: Request, res: Response, next) => {
  const { isValid, userEmail } = await requestContainsValidSessionToken(req);

  if (!isValid) {
    return res.status(401).json({ error: "Session token is missing or expired" });
  }

  if (!userEmail) {
    return res.status(401).json({ error: "No user user email for session token" });
  }

  next();
});

async function createGroup(user: UserModel, res: Response) {
  const groupId = await db.createGroup(user._id, 'untitled');
  if (!groupId) {
    return res.status(500).json({ status: "failed", error: "Could not create group" });
  }

  const group = await db.getGroup(groupId, user._id);
  if (!group) {
    return res.status(500).json({ status: "failed", error: "Could not get group" });
  }

  return res.json({
    status: "success",
    group: group
  });
}

////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////

// Groups

router.get('/api/get_latest_group', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const group = await db.getLatestGroup(user._id);

    return res.json({
      status: "success",
      group: group
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_all_groups', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const results = await db.getAllGroups(user._id);

    return res.json({
      status: "success",
      groups: results,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});

router.post('/api/new_group', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    return await createGroup(user, res);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/update_group_label', async (req: Request, res: Response) => {
  const { groupId, label } = req.body;
  try {
    const result = await db.updateGroupLabel(groupId, label);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    return res.json({
      status: "success",
      groupId: groupId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.delete('/api/delete_group/:group_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const groupId = req.params.group_id;

  try {
    const result = await db.deleteGroup(groupId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    return res.json({ status: "success", message: "Block deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

// Blocks

router.get('/api/get_block/:block_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const blockId = req.params.block_id;
  if (!blockId) {
    return res.status(400).json({ error: "No block ID provided" });
  }

  try {
    const block = await db.getBlock(blockId, user._id);
    return res.json({ status: "success", block });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_blocks_for_group/:group_id', async (req: Request, res: Response) => {
  const groupId = req.params.group_id;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const blocks = await db.getBlocksForGroup(groupId, user._id);

    return res.json({
      status: "success",
      blocks: blocks
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ status: "failed", error: error.message });
    } else {
      res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.post('/api/new_block', async (req: Request, res: Response) => {
  const { group_id, position } = req.body;
  if (!group_id || !position) {
    return res.status(400).json({ error: "No group ID or position provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const blockId = await db.createBlock(user._id, group_id, '', position);
    if (!blockId) {
      return res.status(500).json({ status: "failed", error: "Could not create block" });
    }

    await db.updateGroupUpdatedAt(group_id);

    return res.json({
      status: "success",
      blockId: blockId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/update_block', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { blockId, content, groupId } = req.body;
  if (!blockId) {
    return res.status(400).json({ error: "No blockId provided" });
  }

  try {
    if (typeof content !== 'string') {
      return res.status(400).json({ error: "Content is not a string" });
    }

    const result = await db.updateBlock(blockId, content, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Text ID not found" });
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({
      status: "success",
      blockId: blockId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

router.post('/api/lock_block', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { blockId, locked, groupId } = req.body;
  if (!blockId || typeof locked !== 'boolean') {
    return res.status(400).json({ error: "No blockId or locked value provided" });
  }

  if (!groupId) {
    return res.status(400).json({ error: "No groupId provided" });
  }

  try {
    if (locked) {
      await db.lockBlock(blockId, user._id);
    } else {
      await db.unlockBlock(blockId, user._id);
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

router.post('/api/delete_block', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { blockId, groupId } = req.body;
  if (!blockId || !groupId) {
    return res.status(400).json({ error: "No blockId or groupId provided" });
  }

  try {
    const result = await db.deleteBlock(blockId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

////////////////////////////////////////////////////////////
// Transformations
////////////////////////////////////////////////////////////

router.get('/api/get_transformations_for_group/:group_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  const groupId = req.params.group_id;

  try {
    const transformations = await db.getTransformationsForGroup(groupId, user._id);
    return res.json({ status: "success", transformations });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ status: "failed", error: error.message });
    } else {
      res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.post('/api/new_transformation', async (req: Request, res: Response) => {
  const { groupId, blockId, position } = req.body;
  if (!groupId || !blockId || !position) {
    return res.status(400).json({ status: "failed", error: "Could not add transformation: No group or block id or position provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    const transformationId = await db.createTransformation(user._id, groupId, blockId, '', 1, position);
    if (!transformationId) {
      return res.status(500).json({ status: "failed", error: "Could not create transformation" });
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({ status: "success", transformationId: transformationId });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" })
    }
  }
});

router.post('/api/update_transformation', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  try {
    const { groupId, transformationId, prompt, outputs, locked } = req.body;
    if (prompt) {
      await db.updateTransformationPrompt(transformationId, prompt, user._id);
    }
    if (outputs) {
      await db.updateTransformationOutputs(transformationId, outputs, user._id);
    }
    if (locked) {
      await db.updateTransformationLocked(transformationId, locked, user._id);
    }
    await db.updateGroupUpdatedAt(groupId);
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.post('/api/delete_transformation', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  const { groupId, transformationId } = req.body;
  if (!groupId || !transformationId) {
    return res.status(400).json({ status: "failed", error: "No groupId or transformationId provided" });
  }

  try {
    const result = await db.deleteTransformation(transformationId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "failed", error: "Transformation not found" });
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

////////////////////////////////////////////////////////////
// Transformation Outputs
////////////////////////////////////////////////////////////

router.post('/api/query_transformation_outputs', async (req: Request, res: Response) => {
  const blockIds = req.body.blockIds;
  if (!blockIds) {
    return res.status(400).json({ status: "failed", error: "Could not fetch transformation outputs: no block ids specified" })
  }

  try {
    const transformationOutputs = await db.getTransformationOutputs(blockIds)
    if (!transformationOutputs) {
      return res.status(500).json({ status: "failed", error: "Could not get transformation outputs" })
    }
    return res.json({ status: "success", transformationOutputs })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message })
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" })
    }
  }
});

////////////////////////////////////////////////////////////
// AI Functions
////////////////////////////////////////////////////////////

router.post('/api/run_transformation', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  const { groupId, transformationId } = req.body;
  if (!groupId || !transformationId) {
    return res.status(400).json({ status: "failed", error: "No groupId or transformationId provided" });
  }

  const transformation = await db.getTransformation(transformationId, user._id);
  if (!transformation) {
    return res.status(404).json({ status: "failed", error: "Transformation not found" });
  }

  if (transformation.locked) {
    return res.status(400).json({ status: "failed", error: "Transformation is locked" });
  }

  const errors: string[] = [];
  let outputs: number = 0;

  // Transformation cascading: running a transformation will run all of its (unlocked) child transformations
  // This is done iteratively insted of recursively in order to collect errors and the total count of outputs
  try {
    const queue = [transformation];
    while (queue.length > 0) {
      const transformation = queue.shift();
      if (!transformation) {
        break;
      }

      // Skip locked transformations
      if (transformation.locked) {
        continue;
      }

      // Run the transformation and store the results
      const transformationResult: TransformationResult = await runTransformation(transformation, user._id);
      outputs += transformationResult.outputs;
      errors.push(...transformationResult.errors);
      queue.push(...transformationResult.childTransformations);
    }

    await db.updateGroupUpdatedAt(groupId);

    return res.json({ status: "success", outputs, errors });

  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

////////////////////////////////////////////////////////////
// Start Server
////////////////////////////////////////////////////////////

app.use('/', router);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
