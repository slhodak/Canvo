import pgPromise from 'pg-promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

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
  export async function getGroup(groupId: string) {
    const group = await db.oneOrNone('SELECT id, _id, author_id FROM groups WHERE _id = $1', [groupId]);
    return group;
  }

  export async function getLatestGroup(userEmail: string) {
    const group = await db.oneOrNone('SELECT id, _id, author_id FROM groups WHERE author_id = (SELECT _id FROM users WHERE email = $1) ORDER BY updated_at DESC LIMIT 1', [userEmail]);
    return group;
  }

  // Transformations
  export async function getTransformation(transformationId: string) {
    const transformation = await db.oneOrNone('SELECT id, _id, input_block_id, label FROM transformations WHERE _id = $1', [transformationId]);
    return transformation;
  }

  // Blocks
  export async function getBlock(blockId: string, userEmail: string) {
    const block = await db.oneOrNone('SELECT id, content FROM blocks WHERE id = $1 AND author_id = (SELECT _id FROM users WHERE email = $2)', [blockId, userEmail]);
    return block;
  }

  export async function getAllBlocksInGroup(groupId: string, userEmail: string) {
    const blocks = await db.any(`
      SELECT b._id, b.content
      FROM blocks b
      WHERE b.group_id = $1 AND b.author_id = (SELECT _id FROM users WHERE email = $2)
    `, [groupId, userEmail]);
    return blocks;
  }

  export async function getOutputBlocks(transformationId: string, userEmail: string) {
    const blocks = await db.any(`
      SELECT b._id, b.content
      FROM blocks b
      LEFT JOIN transformation_outputs r ON b._id = r.output_block_id
      WHERE r.transformation_id = $1 AND b.author_id = (SELECT _id FROM users WHERE email = $2)
    `, [transformationId, userEmail]);
    return blocks;
  }

  export async function getLatestBlock(userEmail: string) {
    const row = await db.oneOrNone('SELECT id, content FROM blocks WHERE author_id = (SELECT _id FROM users WHERE email = $1) ORDER BY timestamp DESC LIMIT 1', [userEmail]);
    return row;
  }

  export async function createBlock(userEmail: string): Promise<string | null> {
    const user = await db.oneOrNone('SELECT _id FROM users WHERE email = $1', [userEmail]);
    if (!user) {
      return null;
    }

    const result = await db.one('INSERT INTO blocks (author_id) VALUES ($1) RETURNING _id', [user._id]);
    return result._id;
  }

  export async function updateBlock(blockId: string, text: string) {
    const result = await db.result(`UPDATE blocks SET content = $1, timestamp = CURRENT_TIMESTAMP WHERE _id = $2`, [text, blockId]);
    return result;
  }

  export async function deleteBlock(blockId: string, userEmail: string) {
    const result = await db.result('DELETE FROM blocks WHERE _id = $1 AND author_id = (SELECT _id FROM users WHERE email = $2)', [blockId, userEmail]);
    return result;
  }
}
