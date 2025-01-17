import express, { Router, Express, Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import OpenAI from "openai";
import path from 'path';
import { Database as db } from './db';
import { UserModel } from '@wb/shared-types';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const openai = new OpenAI();

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

async function updateBlock(res: Response, blockId: string, text: string, userId: string) {
  const result = await db.updateBlock(blockId, text, userId);

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Text ID not found" });
  }

  return res.json({
    status: "success",
    blockId: blockId
  });
}

async function createGroup(user: UserModel, res: Response) {
  const groupId = await db.createGroup(user._id);
  if (!groupId) {
    return res.status(500).json({ status: "failed", error: "Could not create group" });
  }

  return res.json({
    status: "success",
    groupId: groupId
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
    console.log("Creating group for user:", user);

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

router.post('/api/new_block/:group_id', async (req: Request, res: Response) => {
  const groupId = req.params.group_id;
  if (!groupId) {
    return res.status(400).json({ error: "No group ID provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const blockId = await db.createBlock(user._id, groupId);
    if (!blockId) {
      return res.status(500).json({ status: "failed", error: "Could not create block" });
    }

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

  const data = req.body;
  if (!data.blockId) {
    return res.status(400).json({ error: "No blockId provided" });
  }

  try {
    if (typeof data.content !== 'string') {
      return res.status(400).json({ error: "Content is not a string" });
    }

    await updateBlock(res, data.blockId, data.content, user._id);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

router.get('/api/get_block_ids_for_group/:group_id', async (req: Request, res: Response) => {
  const groupId = req.params.group_id;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const blocks = await db.getBlocksForGroup(groupId, user._id);

    return res.json({
      status: "success",
      blockIds: blocks.map((block) => block._id)
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ status: "failed", error: error.message });
    } else {
      res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.delete('/api/delete_block/:block_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const blockId = req.params.block_id;

  try {
    const result = await db.deleteBlock(blockId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Block not found" });
    }

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

router.post('/api/new_transformation/:group_id/:block_id', async (req: Request, res: Response) => {
  const groupId = req.params.group_id;
  const blockId = req.params.block_id;

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user from session token" });
    }

    const transformationId = await db.createTransformation(user._id, groupId, blockId);
    if (!transformationId) {
      return res.status(500).json({ status: "failed", error: "Could not create transformation" });
    }

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
    const { transformationId, prompt } = req.body;
    await db.updateTransformation(transformationId, prompt, user._id);
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.delete('/api/delete_transformation/:transformation_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  try {
    const transformationId = req.params.transformation_id;
    const result = await db.deleteTransformation(transformationId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ status: "failed", error: "Transformation not found" });
    }
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    } else {
      return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.post('/api/query_transformation_outputs', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  const blockIds = req.body.blockIds;
  if (!blockIds) {
    return res.status(400).json({ status: "failed", error: "Could not fetch transformation outputs: no block ids specified" })
  }

  try {
    const transformationOutputs = await db.getTransformationOutputs(user._id, blockIds)
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

router.post('/api/rephrase', async (req: Request, res: Response) => {
  const { selectedText = '', context = '' } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful writing assistant. Provide 3 alternative ways to rephrase the selected text, keeping the same meaning but varying the style.' },
        { role: 'user', content: `Context: ${context}\n\nSelected text to rephrase: ${selectedText}` }
      ],
      temperature: 0.7,
      n: 1
    });

    // console.log('OpenAI API Response:', response.data);

    const rephrases = completion.choices[0].message.content?.split('\n')
      .map((s: string) => s.trim().replace(/^[123.]+/, ''))
      .filter((s: string) => s);

    return res.json({ rephrases: rephrases?.slice(0, 3) });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});

router.post('/api/reflect', async (req: Request, res: Response) => {
  const { selectedText = '', context = '' } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a thoughtful assistant. Provide original thoughts or reflections on the given text.' },
        { role: 'user', content: `Context: ${context}\n\nSelected text to reflect on: ${selectedText}` }
      ],
      temperature: 0.7,
      n: 1
    });

    const reflection = completion.choices[0].message?.content;

    return res.json({ reflection });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});

router.post('/api/prompt', async (req: Request, res: Response) => {
  if (req.body.context == undefined || req.body.prompt == undefined) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { context = '', prompt = '' } = req.body;

  if (prompt.length == 0) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  const systemMessage = `
      You are an expert in many subjects. Your writing style is clear and direct.
      You are concise.
  `;

  const promptMessage = `Please respond to the following prompt: ${prompt}. Consider this context in which it was asked: ${context}`

  // console.log("Prompt Message:", promptMessage);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: promptMessage }
      ],
      temperature: 0.7,
      n: 1
    });

    // console.log("OpenAI API Response:", completion.choices[0].message.content);

    const promptResponse = completion.choices[0].message.content;

    return res.json({ promptResponse });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
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
