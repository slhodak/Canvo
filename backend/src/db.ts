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
    const user = await db.oneOrNone('SELECT id, user_id, email FROM users WHERE email = $1', [email]);
    if (user) {
      return;
    }
    await db.none('INSERT INTO users (user_id, email) VALUES ($1, $2)', [uuidv4(), email]);
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

  // Blocks
  export async function getBlock(blockId: string, userEmail: string) {
    const block = await db.oneOrNone('SELECT block_id, content FROM blocks WHERE block_id = $1 AND author_id = (SELECT user_id FROM users WHERE email = $2)', [blockId, userEmail]);
    return block;
  }

  export async function getLatestBlock(userEmail: string) {
    const row = await db.oneOrNone('SELECT block_id, content FROM blocks WHERE author_id = (SELECT user_id FROM users WHERE email = $1) ORDER BY timestamp DESC LIMIT 1', [userEmail]);
    return row;
  }

  export async function createBlock(userEmail: string, text: string): Promise<string | null> {
    const user = await db.oneOrNone('SELECT user_id FROM users WHERE email = $1', [userEmail]);
    if (!user) {
      return null;
    }

    const blockId = uuidv4();
    await db.none('INSERT INTO blocks (block_id, author_id, content) VALUES ($1, $2, $3)', [blockId, user.user_id, text]);
    return blockId;
  }

  export async function updateBlock(blockId: string, text: string) {
    const result = await db.result(`UPDATE blocks SET content = $1, timestamp = CURRENT_TIMESTAMP WHERE block_id = $2`, [text, blockId]);
    return result;
  }

  // Returns all blocks that are not children of any other block
  export async function getAllRootBlocks(userEmail: string) {
    const blocks = await db.any(`
      SELECT b.block_id, b.content
      FROM blocks b
      LEFT JOIN relationships r ON b.block_id = r.parent_block_id
      WHERE r.parent_block_id IS NULL AND b.author_id = (SELECT user_id FROM users WHERE email = $1)
    `, [userEmail]);
    return blocks;
  }

  export async function deleteBlock(blockId: string, userEmail: string) {
    const result = await db.result('DELETE FROM blocks WHERE block_id = $1 AND author_id = (SELECT user_id FROM users WHERE email = $2)', [blockId, userEmail]);
    return result;
  }
}
