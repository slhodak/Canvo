import express, { Router, Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from 'path';
import { Database as db } from './db';
import { UserModel } from '../../shared/types/src/models/user';
import { runPrompt } from './llm';
import stytch from 'stytch';
import { validateNode } from './util';

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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
if (!AI_SERVICE_URL) {
  throw new Error('Cannot start server: AI_SERVICE_URL is not set');
}

// Token costs for different operations
const EMBEDDING_COST = 1;  // Cost per document embedded
const SEARCH_COST = 1;    // Cost per search query
const PROMPT_COST = 1;   // Cost per prompt run

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
  const frontendPath = process.env.FRONTEND_PATH;
  if (!frontendPath) {
    throw new Error('Cannot start production server: FRONTEND_PATH is not set');
  }
  app.use(express.static(frontendPath));

  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
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

  return await db.getUser(session.userEmail);
}

// Redirects from stytch to this endpoint will include an oauth token in the query parameters
router.get('/auth/authenticate', async (req: Request, res: Response) => {
  try {
    const oauthToken = req.query.token as string;
    if (oauthToken === undefined || oauthToken === '') {
      console.warn("No oauth token present in authenticate request; redirecting");
      return res.status(401).json({
        redirectUrl: FRONTEND_DOMAIN,
        status: 'failed',
      });
    }

    // Authenticate the OAuth token
    const response = await stytchClient.oauth.authenticate({
      token: oauthToken,
      session_duration_minutes: 60 * 24 * 7, // 1 week
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
    res.cookie(SESSION_TOKEN, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sixtyMinutesInSeconds * 1000
    });
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
});

router.post('/auth/logout', authenticate, async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) {
    return res.json({ status: 'failed', error: 'No session token found' });
  }

  try {
    // Revoke the session in Stytch
    await stytchClient.sessions.revoke({ session_token: sessionToken });
    await db.invalidateSession(sessionToken);

    // Clear the session cookie
    // TODO: Ensure this does what you think it does
    res.clearCookie(SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      domain: FRONTEND_DOMAIN,
      path: '/'
    });

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({ status: 'failed', error: 'Error logging out' });
  }
});

////////////////////////////////////////////////////////////
// API Routes
////////////////////////////////////////////////////////////

// Middleware to guard the /api/* routes
app.use('/api', authenticate);

router.get('/api/get_user', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  return res.json({ status: 'success', user });
});

////////////////////////////////////////////////////////////
// Projects
////////////////////////////////////////////////////////////

router.get('/api/get_latest_project', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const project = await db.getLatestProject(user.userId);

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

    const results = await db.getAllProjects(user.userId);

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

    const projectId = await db.createProject(user.userId, 'untitled');
    if (!projectId) {
      return res.status(500).json({ status: "failed", error: "Could not create project" });
    }

    const project = await db.getProject(projectId, user.userId);
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

router.delete('/api/delete_project/:projectId', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const projectId = req.params.projectId;

  try {
    const result = await db.deleteProject(projectId, user.userId);
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

////////////////////////////////////////////////////////////
// Nodes
////////////////////////////////////////////////////////////

router.get('/api/get_node/:nodeId', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const nodeId = req.params.nodeId;
  if (!nodeId) {
    return res.status(400).json({ error: "No node ID provided" });
  }

  try {
    const node = await db.getNode(nodeId, user.userId);
    return res.json({ status: "success", node });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_nodes_for_project/:projectId', async (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const nodes = await db.getNodesForProject(projectId, user.userId);

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

// Add new node
router.post('/api/add_node', async (req: Request, res: Response) => {
  const { projectId, node } = req.body;
  if (!projectId || !node) {
    return res.status(400).json({ error: "No projectId or node provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  if (!validateNode(node)) {
    return res.status(400).json({ error: "Invalid node provided" });
  }

  try {
    await db.insertNode(node);
    await db.updateProjectUpdatedAt(projectId);

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

router.post('/api/update_nodes', async (req: Request, res: Response) => {
  const { nodes } = req.body;
  if (!nodes) {
    return res.status(400).json({ error: "No nodes provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  for (const node of nodes) {
    if (!validateNode(node)) {
      return res.status(400).json({ error: "Invalid node received" });
    }
  }

  try {
    for (const node of nodes) {
      await db.updateNode(node);
      await db.updateProjectUpdatedAt(node.projectId);
    }

    return res.json({ status: "success" });
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
    const result = await db.deleteNode(nodeId, user.userId);
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

router.get('/api/get_connections_for_project/:projectId', async (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const connections = await db.getConnectionsForProject(projectId, user.userId);
    return res.json({ status: "success", connections });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.post('/api/set_connections', async (req: Request, res: Response) => {
  // Overwrite all the connections for a project
  const { projectId, connections } = req.body;
  if (!projectId || !connections) {
    return res.status(400).json({ error: "No projectId or connections provided" });
  }

  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    await db.deleteConnectionsForProject(projectId, user.userId);
    for (const connection of connections) {
      await db.createConnection(user.userId, projectId, connection.fromNode, connection.fromOutput, connection.toNode, connection.toInput);
    }

    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.delete('/api/delete_connection/:connectionId', async (req: Request, res: Response) => {
  const connectionId = req.params.connectionId;
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ error: "Could not find user email from session token" });
    }

    const result = await db.deleteConnection(connectionId, user.userId);
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

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance < PROMPT_COST) {
    return res.status(403).json({ status: "failed", error: "Insufficient tokens" });
  }

  // TODO: The prompt node could have multiple inputs?
  // Should we just get the prompt node info from the backend assuming it was already synced, or expect it in the request?
  const { projectId, nodeId, prompt, input } = req.body;
  if (!projectId || !nodeId || !prompt || !input) {
    return res.status(400).json({ status: "failed", error: "No projectId or nodeId or prompt provided" });
  }

  const result = await runPrompt(prompt, input);
  await db.deductTokens(user.userId, PROMPT_COST);
  return res.json({ status: "success", result });
});

router.post('/api/embed', authenticate, async (req: Request, res: Response) => {
  const { chunks } = req.body;
  if (!chunks) {
    return res.status(400).json({ error: "No chunks provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user from session token" });
  }

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance < EMBEDDING_COST) {
    return res.status(403).json({ error: "Insufficient tokens" });
  }

  try {
    // Forward request to AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks: chunks }),
    });

    const result = await aiResponse.json();

    // Deduct tokens after successful operation
    await db.deductTokens(user.userId, EMBEDDING_COST);

    return res.json(result);
  } catch (error) {
    console.error('Error in embed:', error);
    return res.status(500).json({ error: "AI service error" });
  }
});

router.post('/api/search', authenticate, async (req: Request, res: Response) => {
  const { query, top_k } = req.body;
  if (!query || !top_k) {
    return res.status(400).json({ error: "No query or top_k provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user from session token" });
  }

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance < SEARCH_COST) {
    return res.status(403).json({ error: "Insufficient tokens" });
  }

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, top_k: top_k }),
    });

    const result = await aiResponse.json();

    // Deduct tokens after successful operation
    await db.deductTokens(user.userId, SEARCH_COST);

    return res.json(result);
  } catch (error) {
    console.error('Error in search:', error);
    return res.status(500).json({ error: "AI service error" });
  }
});

////////////////////////////////////////////////////////////
// Token transactions
////////////////////////////////////////////////////////////

router.post('/api/add_tokens', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ status: "failed", error: "No amount provided" });
    }

    await db.addTokens(user.userId, amount);
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

router.get('/api/get_token_balance', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    const tokenBalance = await db.getUserTokenBalance(user.userId);
    return res.json({ status: "success", tokenBalance });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

////////////////////////////////////////////////////////////
// Start Server
////////////////////////////////////////////////////////////

app.use('/', router);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

