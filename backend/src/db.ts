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
  export async function getSession(sessionToken: string) {
    const session = await db.oneOrNone('SELECT * FROM sessions WHERE session_token = $1', [sessionToken]);
    return session;
  }

  export async function insertSession(sessionToken: string, email: string, sessionExpiration: Date) {
    await db.none('INSERT INTO sessions (session_token, user_email, session_expiration) VALUES ($1, $2, $3)', [sessionToken, email, sessionExpiration]);
  }

  export async function getInvite(code: string) {
    const invite = await db.oneOrNone('SELECT * FROM invites WHERE invite_code = $1', [code]);
    return invite;
  }

  export async function insertUser(email: string) {
    const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
    if (user) {
      return;
    }
    await db.none('INSERT INTO users (user_id, email) VALUES ($1, $2)', [uuidv4(), email]);
  }

  export async function getUser(sessionToken: string) {
    const result = await db.oneOrNone('SELECT user_email FROM sessions WHERE session_token = $1', [sessionToken]);
    return result ? result.user_email : null;
  }

  export async function updateText(textId: string, text: string) {
    const result = await db.result(`UPDATE texts SET content = $1, timestamp = CURRENT_TIMESTAMP WHERE text_id = $2`, [text, textId]);
    return result;
  }

  export async function createText(userEmail: string, text: string): Promise<string | null> {
    const user = await db.oneOrNone('SELECT user_id FROM users WHERE email = $1', [userEmail]);
    if (!user) {
      return null;
    }

    const textId = uuidv4();
    await db.none('INSERT INTO texts (text_id, author_id, content) VALUES ($1, $2, $3)', [textId, user.user_id, text]);
    return textId;
  }

  export async function getLatestText(userEmail: string) {
    const row = await db.oneOrNone('SELECT text_id, content FROM texts WHERE author_id = (SELECT user_id FROM users WHERE email = $1) ORDER BY timestamp DESC LIMIT 1', [userEmail]);
    return row;
  }

  export async function getAllTexts(userEmail: string) {
    const rows = await db.any('SELECT text_id, content FROM texts WHERE author_id = (SELECT user_id FROM users WHERE email = $1) ORDER BY timestamp DESC', [userEmail]);
    return rows;
  }

  export async function getText(textId: string, userEmail: string) {
    const row = await db.oneOrNone('SELECT text_id, content FROM texts WHERE text_id = $1 AND author_id = (SELECT user_id FROM users WHERE email = $2)', [textId, userEmail]);
    return row;
  }

  export async function deleteText(textId: string, userEmail: string) {
    const result = await db.result('DELETE FROM texts WHERE text_id = $1 AND author_id = (SELECT user_id FROM users WHERE email = $2)', [textId, userEmail]);
    return result;
  }
}

