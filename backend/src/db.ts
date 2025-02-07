import pgPromise from 'pg-promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { UserModel, SessionModel } from '../../shared/types/src/models/user';
import { ProjectModel } from '../../shared/types/src/models/project';
import {
  BaseNode,
  Connection,
  Coordinates,
  IOState,
} from '../../shared/types/src/models/node';
import { formatStateArray } from './util';


dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const pgp = pgPromise();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const db = pgp(process.env.DATABASE_URL);

export namespace Database {

  // Users

  export async function insertUser(email: string) {
    const userId = uuidv4();
    // The database itself can protect against duplicate emails, but we'll check here anyway
    const user = await db.oneOrNone('SELECT id, _id, email FROM users WHERE _id = $1', [userId]);
    if (user) {
      return;
    }
    await db.none('INSERT INTO users (_id, email) VALUES ($1, $2)', [userId, email]);
  }

  export async function getUser(email: string): Promise<UserModel | null> {
    const user = await db.oneOrNone('SELECT id, _id, email FROM users WHERE email = $1', [email]);
    return user;
  }

  // Sessions

  export async function getSession(sessionToken: string): Promise<SessionModel | null> {
    const session = await db.oneOrNone(`
      SELECT id, session_token, user_email, session_start, session_expiration
      FROM sessions
      WHERE session_token = $1
    `, [sessionToken]);
    return session;
  }

  export async function insertSession(sessionToken: string, email: string, sessionExpiration: Date) {
    const values = [sessionToken, email, sessionExpiration];
    await db.none('INSERT INTO sessions (session_token, user_email, session_expiration) VALUES ($1, $2, $3)', values);
  }

  // Projects

  export async function getProject(projectId: string, userId: string): Promise<ProjectModel | null> {
    const values = [projectId, userId];
    const project = await db.oneOrNone('SELECT id, _id, author_id, title, updated_at, created_at FROM projects WHERE _id = $1 and author_id = $2', values);
    return project;
  }

  export async function getLatestProject(userId: string): Promise<ProjectModel | null> {
    const project = await db.oneOrNone(`
      SELECT id, _id, author_id, title, updated_at, created_at
      FROM projects
      WHERE author_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
    return project;
  }

  export async function getAllProjects(userId: string): Promise<ProjectModel[]> {
    const projects = await db.any('SELECT id, _id, author_id, title, updated_at, created_at FROM projects WHERE author_id = $1', [userId]);
    return projects;
  }

  export async function createProject(userId: string, title: string) {
    const projectId = uuidv4();
    await db.none('INSERT INTO projects (_id, author_id, title) VALUES ($1, $2, $3)', [projectId, userId, title]);
    return projectId;
  }

  export async function updateProjectTitle(projectId: string, title: string) {
    const result = await db.result('UPDATE projects SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE _id = $2', [title, projectId]);
    return result;
  }

  export async function updateProjectUpdatedAt(projectId: string) {
    const result = await db.result('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE _id = $1', [projectId]);
    return result;
  }

  export async function deleteProject(projectId: string, userId: string) {
    const result = await db.result('DELETE FROM projects WHERE _id = $1 AND author_id = $2', [projectId, userId]);
    return result;
  }

  // Nodes

  export async function getNode(nodeId: string, userId: string): Promise<BaseNode | null> {
    const values = [nodeId, userId];
    const node = await db.oneOrNone(`
      SELECT id, _id, project_id, name, type, inputs, outputs, coordinates, runs_automatically, properties, is_dirty
      FROM nodes
      WHERE _id = $1 AND author_id = $2
    `, values);
    return node;
  }

  export async function getNodesForProject(projectId: string, userId: string): Promise<BaseNode[]> {
    const nodes = await db.any(`
      SELECT n._id, n.name, n.type, n.inputs, n.outputs, n.coordinates, n.runs_automatically, n.properties, n.is_dirty
      FROM nodes n
      WHERE n.project_id = $1 AND n.author_id = $2
    `, [projectId, userId]);
    return nodes;
  }

  export async function getOutputNodes(nodeId: string, userId: string): Promise<BaseNode[]> {
    const nodes = await db.any(`
      SELECT n._id, n.name, n.type, n.inputs, n.outputs, n.runs_automatically, n.properties, n.is_dirty
      FROM nodes n
      LEFT JOIN node_outputs r ON n._id = r.output_node_id
      WHERE r.node_id = $1 AND n.author_id = $2
    `, [nodeId, userId]);
    return nodes;
  }

  export async function createNode(
    nodeId: string,
    userId: string,
    projectId: string,
    name: string,
    type: string,
    inputs: number,
    outputs: number,
    coordinates: Coordinates,
    runs_automatically: boolean,
    properties: Record<string, any>,
    inputState: IOState,
    outputState: IOState,
    isDirty: boolean
  ) {
    const values = [
      nodeId,
      userId,
      projectId,
      name,
      type,
      inputs,
      outputs,
      coordinates.x,
      coordinates.y,
      runs_automatically,
      properties,
      formatStateArray(inputState),
      formatStateArray(outputState),
      isDirty
    ];

    await db.none(`
      INSERT INTO nodes (
          _id, author_id, project_id, name, type, inputs, outputs,
          coordinates, runs_automatically, properties,
          input_state, output_state, is_dirty
      )
      VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          point($8, $9), $10, $11, 
          $12::state_value[], $13::state_value[], $14
      )
  `, values);
  }

  export async function updateNode(nodeId: string, name: string, type: string, inputs: number, outputs: number, runs_automatically: boolean, properties: Record<string, any>, inputState: IOState, outputState: IOState, isDirty: boolean, userId: string) {
    const values = [name, type, inputs, outputs, runs_automatically, properties, formatStateArray(inputState), formatStateArray(outputState), isDirty, nodeId, userId];
    const result = await db.result(`UPDATE nodes SET name = $1, type = $2, inputs = $3, outputs = $4, runs_automatically = $5, properties = $6, input_state = $7, output_state = $8, is_dirty = $9, updated_at = CURRENT_TIMESTAMP WHERE _id = $10 AND author_id = $11`, values);
    return result;
  }

  export async function deleteNode(nodeId: string, userId: string) {
    const result = await db.result('DELETE FROM nodes WHERE _id = $1 AND author_id = $2', [nodeId, userId]);
    return result;
  }

  // Connections

  export async function getConnection(connectionId: string, userId: string): Promise<Connection | null> {
    const connection = await db.oneOrNone(`
      SELECT id, _id, node_id, output_node_id, output_index
      FROM connections
      WHERE _id = $1 and author_id = $2
    `, [connectionId, userId]);
    return connection;
  }

  export async function getConnectionsForProject(projectId: string, userId: string): Promise<Connection[]> {
    const connections = await db.any(`
      SELECT id, _id, node_id, output_node_id, output_index
      FROM connections
      WHERE project_id = $1 AND author_id = $2
    `, [projectId, userId]);
    return connections;
  }

  export async function createConnection(userId: string, nodeId: string, outputNodeId: string, outputIndex: number): Promise<string | null> {
    const connectionId = uuidv4();
    const values = [connectionId, userId, nodeId, outputNodeId, outputIndex];
    await db.none(`
      INSERT INTO connections (_id, author_id, node_id, output_node_id, output_index)
      VALUES ($1, $2, $3, $4, $5)
    `, values);
    return connectionId;
  }

  export async function deleteConnection(connectionId: string, userId: string) {
    const result = await db.result('DELETE FROM connections WHERE _id = $1 AND author_id = $2', [connectionId, userId]);
    return result;
  }
}
