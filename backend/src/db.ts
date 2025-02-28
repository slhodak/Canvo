import pgPromise from 'pg-promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { UserModel, SessionModel } from '../../shared/types/src/models/user';
import { ProjectModel } from '../../shared/types/src/models/project';
import { BaseNode } from '../../shared/types/src/models/node';
import { Connection } from '../../shared/types/src/models/connection';
import { camelizeColumns, formatIntegerArray } from './util';
import { TransactionType } from '../../shared/types/src/models/tokens';
import { SubscriptionModel, PlanModel, BillingTransactionModel } from '../../shared/types/src/models/subscription';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const pgp = pgPromise({
  receive(e) {
    camelizeColumns(e.data);
  }
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const db = pgp(process.env.DATABASE_URL);

export namespace Database {
  ////////////////////////////////////////////////////////////////////////////////
  // Users
  ////////////////////////////////////////////////////////////////////////////////

  export async function insertUser(email: string): Promise<string> {
    const userId = uuidv4();
    await db.none('INSERT INTO users (user_id, email) VALUES ($1, $2)', [userId, email]);
    return userId;
  }

  export async function getUser(email: string): Promise<UserModel | null> {
    const user = await db.oneOrNone('SELECT id, user_id, email FROM users WHERE email = $1', [email]);
    return user;
  }

  export async function getAllUsers(): Promise<UserModel[]> {
    const users = await db.any('SELECT id, user_id, email FROM users');
    return users;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Subscriptions
  ////////////////////////////////////////////////////////////////////////////////

  export async function getSubscription(subscriptionId: string): Promise<SubscriptionModel | null> {
    const subscription = await db.oneOrNone(`
      SELECT id, subscription_id, user_id, plan_id, start_date, end_date, status
      FROM subscriptions
      WHERE subscription_id = $1
    `, [subscriptionId]);
    return subscription;
  }

  export async function getHighestSubscription(userId: string): Promise<SubscriptionModel | null> {
    const subscription = await db.oneOrNone(`
      SELECT
        s.id, s.subscription_id, s.user_id, s.plan_id, s.start_date, s.end_date, s.status
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.user_id = $1
      ORDER BY p.tier ASC
      LIMIT 1
    `, [userId]);
    return subscription;
  }

  export async function getHighestPlanTier(userId: string): Promise<number | null> {
    const highestPlanTier = await db.oneOrNone(`
      SELECT p.tier
      FROM plans p
      JOIN subscriptions s ON p.plan_id = s.plan_id
      WHERE s.user_id = $1
      ORDER BY p.tier ASC
      LIMIT 1
    `, [userId]);
    return highestPlanTier?.tier ?? null;
  }

  export async function getPlan(planId: string): Promise<PlanModel | null> {
    const plan = await db.oneOrNone(`
      SELECT id, plan_id, tier, name, description, price, created_at, updated_at
      FROM plans
      WHERE plan_id = $1
    `, [planId]);
    return plan;
  }

  export async function getBillingTransactions(subscriptionId: string): Promise<BillingTransactionModel[]> {
    const billingTransactions = await db.any('SELECT id, subscription_id, created_at, amount, status FROM billing_transactions WHERE subscription_id = $1', [subscriptionId]);
    return billingTransactions;
  }

  export async function createBillingTransaction(subscriptionId: string, amount: number, success: boolean, memo: string) {
    const billingTransactionId = uuidv4();
    await db.none(`
      INSERT INTO billing_transactions (
        id, subscription_id, created_at, amount, success, memo
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [billingTransactionId, subscriptionId, new Date(), amount, success, memo]);
  }

  export async function createSubscription(userId: string, planId: string) {
    await db.none(`
      INSERT INTO subscriptions (user_id, plan_id, status)
      VALUES ($1, $2, $3)
    `, [userId, planId, 'active']);
  }

  export async function updateSubscription(subscription: SubscriptionModel) {
    await db.none(`
      UPDATE subscriptions SET end_date = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = $3
    `, [subscription.endDate, subscription.status, subscription.subscriptionId]);
  }

  export async function createPlan(plan: PlanModel) {
    await db.none(`
      INSERT INTO plans (plan_id, name, description, price)
      VALUES ($1, $2, $3, $4)
    `, [plan.planId, plan.name, plan.description, plan.price]);
  }

  export async function getPlanByTier(tier: number): Promise<PlanModel | null> {
    const plan = await db.oneOrNone('SELECT id, plan_id, tier, name, description, price FROM plans WHERE tier = $1', [tier]);
    return plan;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Sessions
  ////////////////////////////////////////////////////////////////////////////////

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

  export async function invalidateSession(sessionToken: string) {
    await db.none('UPDATE sessions SET session_expiration = CURRENT_TIMESTAMP WHERE session_token = $1', [sessionToken]);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Projects
  ////////////////////////////////////////////////////////////////////////////////

  export async function getProject(projectId: string, userId: string): Promise<ProjectModel | null> {
    const values = [projectId, userId];
    const project = await db.oneOrNone('SELECT id, project_id, author_id, title, updated_at, created_at FROM projects WHERE project_id = $1 and author_id = $2', values);
    return project;
  }

  export async function getLatestProject(userId: string): Promise<ProjectModel | null> {
    const project = await db.oneOrNone(`
      SELECT id, project_id, author_id, title, updated_at, created_at
      FROM projects
      WHERE author_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
    return project;
  }

  export async function getAllProjects(userId: string): Promise<ProjectModel[]> {
    const projects = await db.any('SELECT id, project_id, author_id, title, updated_at, created_at FROM projects WHERE author_id = $1', [userId]);
    return projects;
  }

  export async function createProject(userId: string, title: string) {
    const projectId = uuidv4();
    await db.none('INSERT INTO projects (project_id, author_id, title) VALUES ($1, $2, $3)', [projectId, userId, title]);
    return projectId;
  }

  export async function updateProjectTitle(projectId: string, title: string) {
    const result = await db.result('UPDATE projects SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2', [title, projectId]);
    return result;
  }

  export async function updateProjectUpdatedAt(projectId: string) {
    const result = await db.result('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE project_id = $1', [projectId]);
    return result;
  }

  export async function deleteProject(projectId: string, userId: string) {
    const result = await db.result('DELETE FROM projects WHERE project_id = $1 AND author_id = $2', [projectId, userId]);
    return result;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Nodes
  ////////////////////////////////////////////////////////////////////////////////

  export async function getNode(nodeId: string, userId: string): Promise<BaseNode | null> {
    const values = [nodeId, userId];
    const node = await db.oneOrNone(`
      SELECT node_id, project_id, author_id, name, label, display, type, inputs,
      outputs, coordinates, run_type, cache_type, properties, output_state, input_types, index_selections
      FROM nodes
      WHERE node_id = $1 AND author_id = $2
    `, values);
    return node;
  }

  export async function getNodesForProject(projectId: string, userId: string): Promise<BaseNode[]> {
    const nodes = await db.any(`
      SELECT n.node_id, n.project_id, n.author_id, n.name, n.label, n.display, n.type, n.inputs, n.outputs,
      n.coordinates, n.run_type, n.cache_type, n.properties, n.output_state, n.input_types, n.index_selections
      FROM nodes n
      WHERE n.project_id = $1 AND n.author_id = $2
    `, [projectId, userId]);
    return nodes;
  }

  export async function insertNode(node: BaseNode) {
    const values = [
      node.nodeId,
      node.authorId,
      node.projectId,
      node.name,
      node.label,
      node.display,
      node.type,
      node.inputs,
      node.outputs,
      node.coordinates.x,
      node.coordinates.y,
      node.runType,
      node.cacheType,
      node.properties,
      JSON.stringify(node.outputState),
      JSON.stringify(node.inputTypes),
      formatIntegerArray(node.indexSelections),
    ];

    await db.none(`
      INSERT INTO nodes (
        node_id, author_id, project_id, name, label, display, type, inputs, outputs,
        coordinates, run_type, cache_type, properties, output_state, input_types, index_selections
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        point($10, $11), $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17::integer[]
      )
    `, values);
  }

  export async function updateNode(node: BaseNode) {
    const values = [
      node.nodeId,
      node.authorId,
      node.projectId,
      node.name,
      node.label,
      node.display,
      node.type,
      node.inputs,
      node.outputs,
      node.coordinates.x,
      node.coordinates.y,
      node.runType,
      node.cacheType,
      node.properties,
      JSON.stringify(node.outputState),
      JSON.stringify(node.inputTypes),
      formatIntegerArray(node.indexSelections),
    ];
    await db.none(`
      UPDATE nodes 
      SET node_id = $1, author_id = $2, project_id = $3, name = $4, label = $5, display = $6,
      type = $7, inputs = $8, outputs = $9, coordinates = point($10, $11), run_type = $12, cache_type = $13,
      properties = $14, output_state = $15::jsonb, input_types = $16::jsonb, index_selections = $17::integer[],
      updated_at = CURRENT_TIMESTAMP
      WHERE node_id = $1
    `, values);
  }

  export async function deleteNode(nodeId: string, userId: string) {
    const result = await db.result('DELETE FROM nodes WHERE node_id = $1 AND author_id = $2', [nodeId, userId]);
    return result;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Connections
  ////////////////////////////////////////////////////////////////////////////////

  export async function getConnection(connectionId: string, userId: string): Promise<Connection | null> {
    const connection = await db.oneOrNone(`
      SELECT id, connection_id, author_id, project_id, from_node, from_output, to_node, to_input
      FROM connections
      WHERE connection_id = $1 and author_id = $2
    `, [connectionId, userId]);
    return connection;
  }

  export async function getConnectionsForProject(projectId: string, userId: string): Promise<Connection[]> {
    const connections = await db.any(`
      SELECT author_id, project_id, connection_id, from_node, from_output, to_node, to_input
      FROM connections
      WHERE project_id = $1 AND author_id = $2
    `, [projectId, userId]);
    return connections;
  }

  export async function createConnection(userId: string, projectId: string, fromNodeId: string, fromNodeOutput: string, toNodeId: number, toNodeInput: number): Promise<string | null> {
    const connectionId = uuidv4();
    const values = [userId, projectId, connectionId, fromNodeId, fromNodeOutput, toNodeId, toNodeInput];
    await db.none(`
      INSERT INTO connections (author_id, project_id, connection_id, from_node, from_output, to_node, to_input)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, values);
    return connectionId;
  }

  export async function deleteConnection(connectionId: string, userId: string) {
    const result = await db.result('DELETE FROM connections WHERE connection_id = $1 AND author_id = $2', [connectionId, userId]);
    return result;
  }

  export async function deleteConnectionsForProject(projectId: string, userId: string) {
    const result = await db.result('DELETE FROM connections WHERE project_id = $1 AND author_id = $2', [projectId, userId]);
    return result;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Token Management
  ////////////////////////////////////////////////////////////////////////////////

  export async function getUserTokenBalance(userId: string): Promise<number | null> {
    const result = await db.oneOrNone(`
      SELECT token_balance 
      FROM user_token_balance 
      WHERE user_id = $1
    `, [userId]);

    return result?.tokenBalance ?? null;
  }

  export async function deductTokens(userId: string, amount: number): Promise<void> {
    // First check if user has a token record
    const hasRecord = await db.oneOrNone(`
      SELECT user_id 
      FROM user_token_balance
      WHERE user_id = $1
    `, [userId]);

    if (hasRecord) {
      // Update existing record
      await db.none(`
        UPDATE user_token_balance 
        SET token_balance = token_balance - $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND token_balance >= $2
      `, [userId, amount]);
    } else {
      // Insert new record with negative balance
      // This should rarely happen as users should start with some tokens
      await db.none(`
        INSERT INTO user_token_balance (user_id, token_balance)
        VALUES ($1, -$2)
      `, [userId, amount]);
    }
  }

  export async function addTokens(userId: string, amount: number): Promise<void> {
    // First check if user has a token record
    const hasRecord = await db.oneOrNone(`
      SELECT user_id 
      FROM user_token_balance 
      WHERE user_id = $1
    `, [userId]);

    if (hasRecord) {
      // Update existing record
      await db.none(`
        UPDATE user_token_balance 
        SET token_balance = token_balance + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [userId, amount]);
    } else {
      // Insert new record
      await db.none(`
        INSERT INTO user_token_balance (user_id, token_balance)
        VALUES ($1, $2)
      `, [userId, amount]);
    }
  }

  export async function logTokenTransaction(
    userId: string,
    amount: number,
    transactionType: TransactionType,
  ): Promise<void> {
    const transactionId = uuidv4();
    await db.none(`
      INSERT INTO token_transactions (
        user_id, 
        transaction_id,
        amount, 
        transaction_type,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, transactionId, amount, transactionType, new Date()]);
  }
}
