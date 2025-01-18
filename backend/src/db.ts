import pgPromise from 'pg-promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import {
  UserModel,
  SessionModel,
  GroupModel,
  BlockModel,
  TransformationModel,
  TransformationOutputModel,
} from '@wb/shared-types';

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

  // Invites

  export async function getInvite(code: string) {
    const invite = await db.oneOrNone('SELECT id, invite_code, user_email FROM invites WHERE invite_code = $1', [code]);
    return invite;
  }

  // Groups

  export async function getGroup(groupId: string, userId: string): Promise<GroupModel | null> {
    const values = [groupId, userId];
    const group = await db.oneOrNone('SELECT id, _id, author_id, label, updated_at, created_at FROM groups WHERE _id = $1 and author_id = $2', values);
    return group;
  }

  export async function getLatestGroup(userId: string): Promise<GroupModel | null> {
    const group = await db.oneOrNone(`
      SELECT id, _id, author_id, label, updated_at, created_at
      FROM groups
      WHERE author_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [userId]);
    return group;
  }

  export async function getAllGroups(userId: string): Promise<GroupModel[]> {
    const groups = await db.any('SELECT id, _id, author_id, label, updated_at, created_at FROM groups WHERE author_id = $1', [userId]);
    return groups;
  }

  export async function createGroup(userId: string, label: string) {
    const groupId = uuidv4();
    await db.none('INSERT INTO groups (_id, author_id, label) VALUES ($1, $2, $3)', [groupId, userId, label]);
    return groupId;
  }

  export async function updateGroupLabel(groupId: string, label: string) {
    const result = await db.result('UPDATE groups SET label = $1, updated_at = CURRENT_TIMESTAMP WHERE _id = $2', [label, groupId]);
    return result;
  }

  export async function deleteGroup(groupId: string, userId: string) {
    const result = await db.result('DELETE FROM groups WHERE _id = $1 AND author_id = $2', [groupId, userId]);
    return result;
  }

  // Blocks

  export async function getBlock(blockId: string, userId: string): Promise<BlockModel | null> {
    const values = [blockId, userId];
    const block = await db.oneOrNone('SELECT id, _id, group_id, author_id, position, content FROM blocks WHERE _id = $1 AND author_id = $2', values);
    return block;
  }

  export async function getBlocksForGroup(groupId: string, userId: string): Promise<BlockModel[]> {
    const blocks = await db.any(`
      SELECT b._id, b.content, b.position
      FROM blocks b
      WHERE b.group_id = $1 AND b.author_id = $2
    `, [groupId, userId]);
    return blocks;
  }

  export async function getOutputBlocks(transformationId: string, userId: string): Promise<BlockModel[]> {
    const blocks = await db.any(`
      SELECT b._id, b.content, b.position
      FROM blocks b
      LEFT JOIN transformation_outputs r ON b._id = r.output_block_id
      WHERE r.transformation_id = $1 AND b.author_id = $2
    `, [transformationId, userId]);
    return blocks;
  }

  export async function createBlock(userId: string, groupId: string, content: string, position: string): Promise<string | null> {
    const blockId = uuidv4();
    const values = [blockId, userId, groupId, content, position];
    await db.none('INSERT INTO blocks (_id, author_id, group_id, content, position) VALUES ($1, $2, $3, $4, $5)', values);
    return blockId;
  }

  export async function updateBlock(blockId: string, text: string, userId: string) {
    const values = [text, blockId, userId];
    const result = await db.result(`UPDATE blocks SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE _id = $2 AND author_id = $3`, values);
    return result;
  }

  export async function deleteBlock(blockId: string, userId: string) {
    const result = await db.result('DELETE FROM blocks WHERE _id = $1 AND author_id = $2', [blockId, userId]);
    return result;
  }

  // Transformations

  export async function getTransformation(transformationId: string, userId: string): Promise<TransformationModel | null> {
    const transformation = await db.oneOrNone(`
      SELECT id, _id, group_id, input_block_id, prompt, outputs
      FROM transformations
      WHERE _id = $1 and author_id = $2
    `, [transformationId, userId]);
    return transformation;
  }

  export async function getTransformationsForGroup(groupId: string, userId: string): Promise<TransformationModel[]> {
    const transformations = await db.any(`
      SELECT id, _id, input_block_id, prompt, outputs
      FROM transformations
      WHERE group_id = $1 AND author_id = $2
    `, [groupId, userId]);
    return transformations;
  }

  export async function createTransformation(userId: string, groupId: string, blockId: string, prompt: string, outputs: number): Promise<string | null> {
    const transformationId = uuidv4();
    const values = [transformationId, userId, groupId, blockId, prompt, outputs];
    await db.none(`
      INSERT INTO transformations (_id, author_id, group_id, input_block_id, prompt, outputs)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, values);
    return transformationId;
  }

  export async function updateTransformationPrompt(transformationId: string, prompt: string, userId: string) {
    const values = [prompt, transformationId, userId];
    const result = await db.result('UPDATE transformations SET prompt = $1, updated_at = CURRENT_TIMESTAMP WHERE _id = $2 AND author_id = $3', values);
    return result;
  }

  export async function updateTransformationOutputs(transformationId: string, outputs: number, userId: string) {
    const values = [outputs, transformationId, userId];
    const result = await db.result('UPDATE transformations SET outputs = $1, updated_at = CURRENT_TIMESTAMP WHERE _id = $2 AND author_id = $3', values);
    return result;
  }

  export async function deleteTransformation(transformationId: string, userId: string) {
    const result = await db.result('DELETE FROM transformations WHERE _id = $1 AND author_id = $2', [transformationId, userId]);
    return result;
  }

  // Transformation outputs

  export async function getTransformationOutputs(blockIds: string[]): Promise<TransformationOutputModel[] | null> {
    if (blockIds.length === 0) {
      return [];
    }

    const results = await db.any(`
      SELECT id, transformation_id, output_block_id
      FROM transformation_outputs
      WHERE output_block_id IN ($1:csv)
    `, [blockIds]);
    return results;
  }

  export async function createTransformationOutput(transformationId: string, outputBlockId: string) {
    await db.none('INSERT INTO transformation_outputs (transformation_id, output_block_id) VALUES ($1, $2)', [transformationId, outputBlockId]);
  }
}
