import express, { Router, Express, Request, Response, NextFunction } from "express";
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
import stytch from 'stytch';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const app: Express = express();
const router = Router();
const port = 3000;

const allowedOrigin = process.env.NODE_ENV == 'development' ? 'http://localhost:5173' : 'https://canvo.app';
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length == 0) {
  throw new Error('Cannot start server: JWT_SECRET is not set');
}
const sixtyMinutesInSeconds = 60 * 60;
const SESSION_TOKEN = "session_token";
const FRONTEND_DOMAIN = process.env.APP_DOMAIN;
if (!FRONTEND_DOMAIN) {
  throw new Error('Cannot start server: APP_DOMAIN is not set');
}

// Set up Stytch Authentication

const stytchProjectId = process.env.STYTCH_PROJECT_ID;
if (stytchProjectId === null || stytchProjectId === undefined) {
  throw new Error('Cannot start server: STYTCH_PROJECT_ID is not set');
}
const stytchSecret = process.env.STYTCH_SECRET;
if (stytchSecret === null || stytchSecret === undefined) {
  throw new Error('Cannot start server: STYTCH_SECRET is not set');
}

const stytchClient = new stytch.Client({
  project_id: stytchProjectId,
  secret: stytchSecret,
});

// App Middleware

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
      connectSrc: ["'self'", 'https://www.canvo.app', 'https://*.stytch.com'],
      imgSrc: ["'self'", 'https://www.canvo.app', 'https://*.stytch.com']
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
    // When the app is running in development mode, the frontend is served by Vite
    res.redirect(FRONTEND_DOMAIN)
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

async function checkSessionToken(sessionToken: string): Promise<boolean> {
  try {
    // Authenticate the Session Token
    const response = await stytchClient.sessions.authenticate({ session_token: sessionToken });
    return response.status_code === 200
  } catch (error) {
    console.error('Error checking session token:', error);
    return false
  }
}

// Middleware to authenticate the session token
// Requests from the frontend will include a session token as a cookie
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) {
    return res.json({ status: 'failed', error: 'No session token found' });
  }

  if (await checkSessionToken(sessionToken)) {
    next();
  } else {
    return res.json({ status: 'failed', error: 'Session token invalid' });
  }
}

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

// Redirects from stytch to this endpoint will include an oauth token in the query parameters
router.get('/auth/authenticate', async (req: Request, res: Response) => {
  try {
    const oauthToken = req.query.token as string;
    if (!oauthToken) {
      return res.status(401).json({
        redirectUrl: FRONTEND_DOMAIN,
        status: 'failed',
      });
    }

    // Authenticate the OAuth token
    const response = await stytchClient.oauth.authenticate({
      token: oauthToken,
      session_duration_minutes: 60,
    })

    const sessionToken = response.session_token;
    const sessionExpirationString = response.provider_values.expires_at;
    const email = response.user.emails[0].email;

    const user = await db.getUser(email);
    if (!user) {
      console.debug("User not found in db, creating...");
      await db.insertUser(email);
    }

    console.debug("Creating a session for this user");
    const sessionExpiration = sessionExpirationString ? new Date(sessionExpirationString) : new Date(Date.now() + sixtyMinutesInSeconds * 1000);
    await db.insertSession(sessionToken, email, sessionExpiration);

    // The session expires in 60 minutes, as specified in the oauth authentication request above
    res.cookie(SESSION_TOKEN, sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: sixtyMinutesInSeconds * 1000 });
    res.redirect(FRONTEND_DOMAIN);

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Authentication failed with error: ${error}`);
      return res.redirect(FRONTEND_DOMAIN);
    } else {
      console.error('Authentication failed with an unknown error');
      return res.redirect(FRONTEND_DOMAIN);
    }
  }
});

// The frontend SPA will check the validity of its session token when it first opens
router.get('/auth/check', async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session_token;
  if (sessionToken === undefined) {
    // This prevents the frontend from showing a 'failed' message if there was no session token to check
    return res.json({ status: 'neutral' });
  }

  const success = await checkSessionToken(sessionToken);
  if (!success) {
    return res.json({ status: 'failed' });
  } else {
    return res.json({ status: 'success' });
  }
})

////////////////////////////////////////////////////////////
// API Routes
////////////////////////////////////////////////////////////

// Middleware to guard the /api/* routes
app.use('/api', authenticate);

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

  const { blockId, content, locked, groupId } = req.body;
  if (!blockId || !groupId) {
    return res.status(400).json({ error: "No blockId or groupId provided" });
  }

  try {
    if (typeof content === 'string') {
      const result = await db.updateBlock(blockId, content, user._id);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Text ID not found" });
      }
    }

    if (locked !== undefined) {
      if (locked) {
        await db.lockBlock(blockId, user._id);
      } else {
        await db.unlockBlock(blockId, user._id);
      }
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

      const block = await db.getBlock(transformation.input_block_id, user._id);
      if (!block) {
        errors.push(`Block not found for transformation: ${transformation.input_block_id}`);
        continue;
      }

      if (block.locked || transformation.locked) {
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
