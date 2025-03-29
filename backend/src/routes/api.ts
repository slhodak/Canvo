import { Router, Request, Response } from 'express';
import { Database as db } from '../db';
import { authenticate, getUserFromSessionToken } from "./auth";
import { validateNode } from '../util';

// Middleware to guard the /api/* routes
const apiRouter = Router();
apiRouter.use('/', authenticate);

apiRouter.get('/get_user', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  return res.json({ status: 'success', user });
});

apiRouter.delete('/delete_user', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: 'failed', error: "Could not find user email from session token" });
    }

    await db.deleteUser(user.userId);

    return res.json({ status: 'success' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: 'failed', error: error.message });
    }
    return res.status(500).json({ status: 'failed', error: "An unknown error occurred" });
  }
})

////////////////////////////////////////////////////////////
// Projects
////////////////////////////////////////////////////////////

apiRouter.get('/get_latest_project', async (req: Request, res: Response) => {
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

apiRouter.get('/get_all_projects', async (req: Request, res: Response) => {
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

apiRouter.post('/new_project', async (req: Request, res: Response) => {
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

apiRouter.post('/update_project_title', async (req: Request, res: Response) => {
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

apiRouter.delete('/delete_project/:projectId', async (req: Request, res: Response) => {
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

apiRouter.get('/get_node/:nodeId', async (req: Request, res: Response) => {
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

apiRouter.get('/get_nodes_for_project/:projectId', async (req: Request, res: Response) => {
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
apiRouter.post('/add_node', async (req: Request, res: Response) => {
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

apiRouter.post('/update_node', async (req: Request, res: Response) => {
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
    // console.debug(`Updating node ${node.nodeId} in project ${projectId}`, JSON.stringify(node));
    await db.updateNode(node);
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "An unknown error occurred" });
  }
});

apiRouter.post('/update_nodes', async (req: Request, res: Response) => {
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

apiRouter.post('/delete_node', async (req: Request, res: Response) => {
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

apiRouter.get('/get_connections_for_project/:projectId', async (req: Request, res: Response) => {
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

apiRouter.post('/set_connections', async (req: Request, res: Response) => {
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

apiRouter.delete('/delete_connection/:connectionId', async (req: Request, res: Response) => {
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
// Non-AI Functions
////////////////////////////////////////////////////////////

apiRouter.post('/run_fetch', async (req: Request, res: Response) => {
  let { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  // If the URL is just a domain, add the https:// prefix
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/html',
      'Access-Control-Allow-Origin': '*',
    }
  });

  const text = await response.text();
  return res.json({ status: "success", text });
});

export { apiRouter };
