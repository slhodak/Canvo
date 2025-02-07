import express, { Router, Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from 'path';
import { Database as db } from './db';
import { UserModel } from '../../shared/types/src/models/user';
import {
  TextNode,
  PromptNode,
  SaveNode,
  ViewNode,
  MergeNode,
} from '../../shared/types/src/models/node';
import { runPrompt } from './llm';
import stytch from 'stytch';
import { v4 as uuidv4 } from 'uuid';

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

// Projects

router.get('/api/get_latest_project', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const project = await db.getLatestProject(user._id);

    return res.json({
      status: "success",
      project: project
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_all_projects', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const results = await db.getAllProjects(user._id);

    return res.json({
      status: "success",
      projects: results,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
});

router.post('/api/new_project', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const projectId = await db.createProject(user._id, 'untitled');
    if (!projectId) {
      return res.status(500).json({ status: "failed", error: "Could not create project" });
    }

    const project = await db.getProject(projectId, user._id);
    if (!project) {
      return res.status(500).json({ status: "failed", error: "Could not get project" });
    }

    return res.json({
      status: "success",
      project: project
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/update_project_title', async (req: Request, res: Response) => {
  const { projectId, title } = req.body;
  try {
    const result = await db.updateProjectTitle(projectId, title);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({
      status: "success",
      projectId: projectId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.delete('/api/delete_project/:project_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const projectId = req.params.project_id;

  try {
    const result = await db.deleteProject(projectId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({ status: "success", message: "Project deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

// Blocks

router.get('/api/get_node/:node_id', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const nodeId = req.params.node_id;
  if (!nodeId) {
    return res.status(400).json({ error: "No node ID provided" });
  }

  try {
    const node = await db.getNode(nodeId, user._id);
    return res.json({ status: "success", node });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_nodes_for_project/:project_id', async (req: Request, res: Response) => {
  const projectId = req.params.project_id;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const nodes = await db.getNodesForProject(projectId, user._id);

    return res.json({
      status: "success",
      nodes: nodes
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ status: "failed", error: error.message });
    } else {
      res.status(500).json({ status: "failed", error: "An unknown error occurred" });
    }
  }
});

router.post('/api/new_node', async (req: Request, res: Response) => {
  const { project_id, type } = req.body;
  if (!project_id || !type) {
    return res.status(400).json({ error: "No project ID or type provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    let node = null;
    switch (type) {
      case 'text':
        node = new TextNode(uuidv4());
        break;
      case 'prompt':
        node = new PromptNode(uuidv4());
        break;
      case 'save':
        node = new SaveNode(uuidv4());
        break;
      case 'view':
        node = new ViewNode(uuidv4());
        break;
      case 'merge':
        node = new MergeNode(uuidv4());
        break;
      default:
        return res.status(400).json({ error: "Invalid node type" });
    }

    if (!node) {
      return res.status(500).json({ status: "failed", error: "Could not create node object" });
    }

    const nodeId = await db.createNode(user._id, project_id, node.name, node.type, node.inputs, node.outputs, node.runsAutomatically, node.properties);
    if (!nodeId) {
      return res.status(500).json({ status: "failed", error: "Could not create node in database" });
    }

    await db.updateProjectUpdatedAt(project_id);

    return res.json({
      status: "success",
      nodeId: nodeId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/update_node', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { nodeId, projectId, name, type, inputs, outputs, runsAutomatically, properties } = req.body;
  if (!nodeId || !projectId) {
    return res.status(400).json({ error: "No nodeId or projectId provided" });
  }

  try {
    const result = await db.updateNode(nodeId, name, type, inputs, outputs, runsAutomatically, properties, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Node ID not found" });
    }

    await db.updateProjectUpdatedAt(projectId);

    return res.json({
      status: "success",
      nodeId: nodeId
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

router.post('/api/delete_node', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { nodeId, projectId } = req.body;
  if (!nodeId || !projectId) {
    return res.status(400).json({ error: "No nodeId or projectId provided" });
  }

  try {
    const result = await db.deleteNode(nodeId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Node not found" });
    }

    await db.updateProjectUpdatedAt(projectId);

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

////////////////////////////////////////////////////////////
// Connections
////////////////////////////////////////////////////////////

router.get('/api/get_connections_for_project/:project_id', async (req: Request, res: Response) => {
  const projectId = req.params.project_id;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const connections = await db.getConnectionsForProject(projectId, user._id);
    return res.json({ status: "success", connections });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/create_connection', async (req: Request, res: Response) => {
  const { nodeId, outputNodeId, outputIndex } = req.body;
  if (!nodeId || !outputNodeId || !outputIndex) {
    return res.status(400).json({ error: "No nodeId or outputNodeId or outputIndex provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const connectionId = await db.createConnection(user._id, nodeId, outputNodeId, outputIndex);
    return res.json({ status: "success", connectionId });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.delete('/api/delete_connection/:connection_id', async (req: Request, res: Response) => {
  const connectionId = req.params.connection_id;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const result = await db.deleteConnection(connectionId, user._id);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Connection not found" });
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
// AI Functions
////////////////////////////////////////////////////////////

router.post('/api/run_prompt', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  // TODO: The prompt node could have multiple inputs?
  // Should we just get the prompt node info from the backend assuming it was already synced, or expect it in the request?
  const { projectId, nodeId, prompt, input } = req.body;
  if (!projectId || !nodeId || !prompt || !input) {
    return res.status(400).json({ status: "failed", error: "No projectId or nodeId or prompt provided" });
  }

  const result = await runPrompt(prompt, input);
  return res.json({ status: "success", result });
});

////////////////////////////////////////////////////////////
// Start Server
////////////////////////////////////////////////////////////

app.use('/', router);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
