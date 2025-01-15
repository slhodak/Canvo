import pgPromise from 'pg-promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { User, Group, Block, Transformation } from '@wb/shared-types';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const pgp = pgPromise();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const db = pgp(process.env.DATABASE_URL);

export namespace Database {
  // Users
  export async function insertUser(email: string) {
    const user = await db.oneOrNone('SELECT id, _id, email FROM users WHERE email = $1', [email]);
    if (user) {
      return;
    }
    await db.none('INSERT INTO users (_id, email) VALUES ($1, $2)', [uuidv4(), email]);
  }

  export async function getUser(sessionToken: string) {
    const result = await db.oneOrNone('SELECT user_email FROM sessions WHERE session_token = $1', [sessionToken]);
    return result ? result.user_email : null;
  }

  /**
   *  @throws Error if user not found
   */
  export async function getUserByEmail(email: string): Promise<User> {
    const user = await db.oneOrNone('SELECT id, _id, email FROM users WHERE email = $1', [email]);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    return user;
  }

  // Sessions
  export async function getSession(sessionToken: string) {
    const session = await db.oneOrNone('SELECT id, session_token, user_email, session_start, session_expiration FROM sessions WHERE session_token = $1', [sessionToken]);
    return session;
  }

  export async function insertSession(sessionToken: string, email: string, sessionExpiration: Date) {
    await db.none('INSERT INTO sessions (session_token, user_email, session_expiration) VALUES ($1, $2, $3)', [sessionToken, email, sessionExpiration]);
  }

  // Invites
  export async function getInvite(code: string) {
    const invite = await db.oneOrNone('SELECT id, invite_code, user_email FROM invites WHERE invite_code = $1', [code]);
    return invite;
  }

  // Groups
  export async function getGroup(groupId: string, userEmail: string): Promise<Group | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const group = await db.oneOrNone('SELECT id, _id, author_id FROM groups WHERE _id = $1 and author_id = $2', [groupId, user._id]);
    return group;
  }

  export async function getLatestGroup(userEmail: string): Promise<Group | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const group = await db.oneOrNone('SELECT id, _id, author_id FROM groups WHERE author_id = $1 ORDER BY updated_at DESC LIMIT 1', [user._id]);
    return group;
  }

  export async function createGroup(userEmail: string) {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const group = await db.one('INSERT INTO groups (author_id) VALUES ($1) RETURNING _id', [user._id]);
    return group._id;
  }

  // Transformations
  export async function getTransformation(transformationId: string, userEmail: string): Promise<Transformation | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const transformation = await db.oneOrNone('SELECT id, _id, input_block_id, label FROM transformations WHERE _id = $1 and author_id = $2', [transformationId, user._id]);
    return transformation;
  }

  // Blocks
  export async function getBlock(blockId: string, userEmail: string): Promise<Block | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const block = await db.oneOrNone('SELECT id, content FROM blocks WHERE id = $1 AND author_id = $2', [blockId, user._id]);
    return block;
  }

  export async function getAllBlocksInGroup(groupId: string, userEmail: string): Promise<Block[]> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return [];
    }
    const blocks = await db.any(`
      SELECT b._id, b.content
      FROM blocks b
      WHERE b.group_id = $1 AND b.author_id = $2
    `, [groupId, user._id]);
    return blocks;
  }

  export async function getOutputBlocks(transformationId: string, userEmail: string): Promise<Block[]> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return [];
    }
    const blocks = await db.any(`
      SELECT b._id, b.content
      FROM blocks b
      LEFT JOIN transformation_outputs r ON b._id = r.output_block_id
      WHERE r.transformation_id = $1 AND b.author_id = $2
    `, [transformationId, user._id]);
    return blocks;
  }

  export async function getLatestBlock(userEmail: string): Promise<Block | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const row = await db.oneOrNone('SELECT id, content FROM blocks WHERE author_id = $1 ORDER BY timestamp DESC LIMIT 1', [user._id]);
    return row;
  }

  export async function createBlock(userEmail: string): Promise<string | null> {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }

    const result = await db.one('INSERT INTO blocks (author_id) VALUES ($1) RETURNING _id', [user._id]);
    return result._id;
  }

  export async function updateBlock(blockId: string, text: string, userEmail: string) {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const result = await db.result(`UPDATE blocks SET content = $1, timestamp = CURRENT_TIMESTAMP WHERE _id = $2 AND author_id = $3`, [text, blockId, user._id]);
    return result;
  }

  export async function deleteBlock(blockId: string, userEmail: string) {
    const user = await getUserByEmail(userEmail);
    if (!user) {
      return null;
    }
    const result = await db.result('DELETE FROM blocks WHERE _id = $1 AND author_id = $2', [blockId, user._id]);
    return result;
  }
}
