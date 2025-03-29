import { Router, Request, Response, NextFunction } from 'express';
import stytch from 'stytch';
import { Database as db } from '../db';
import { UserModel } from 'wc-shared';
import { FRONTEND_DOMAIN, SESSION_TOKEN, sevenDaysInSeconds, STYTCH_PROJECT_ID, STYTCH_SECRET } from '../constants';
import { addUserTokens, createDefaultProject, broadcastBalanceUpdate } from '../util';
import { websocketClients } from '../app';

const stytchClient = new stytch.Client({
  project_id: STYTCH_PROJECT_ID,
  secret: STYTCH_SECRET,
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
    console.warn("Authenticate failed: no session token found");
    return res.json({ status: 'failed', error: 'No session token found' });
  }

  if (await checkSessionToken(sessionToken)) {
    next()
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

const authRouter = Router();

// Redirects from stytch to this endpoint will include an oauth token in the query parameters
authRouter.get('/authenticate', async (req: Request, res: Response) => {
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
      session_duration_minutes: sevenDaysInSeconds / 60 // Seven days in minutes
    });

    const sessionToken = response.session_token;
    const email = response.user.emails[0].email;

    // Create user if one does not exist
    const user = await db.getUser(email);
    if (!user) {
      console.debug("User not found; creating with a free subscription");
      const userId = await db.insertUser(email);
      const user = await db.getUser(email);
      if (!user) {
        console.error("Could not find user after creating");
        return res.status(500).json({ status: 'failed', error: "Could not find or create user: free plan missing" });
      }
      const freePlan = await db.getPlanByTier(0);
      if (!freePlan) {
        console.error("Could not find free plan");
        return res.status(500).json({ status: 'failed', error: "Could not find or create user: free plan missing" });
      }
      console.debug(`Creating subscription and adding 100 bonus tokens to user ${userId}`);
      await db.createSubscription(userId, freePlan.planId);
      await addUserTokens(user);
      const tokenBalance = await db.getUserTokenBalance(user.userId);
      if (tokenBalance !== null) {
        broadcastBalanceUpdate(user.userId, tokenBalance, websocketClients);
      }
      // Create default project
      await createDefaultProject(userId);
    }

    console.debug("Creating a session for this user");
    const bufferTime = 10 * 60; // Expire the token 10 minutes before the Stytch session expires
    const maxAge = sevenDaysInSeconds * 1000 - (bufferTime * 1000);
    const expirationTime = new Date(Date.now() + maxAge);
    await db.insertSession(sessionToken, email, expirationTime);

    res.cookie(SESSION_TOKEN, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: maxAge // Express.js expects a value in milliseconds, despite HTTP saying it's in seconds
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
authRouter.get('/check', async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session_token;
  if (sessionToken === undefined) {
    return res.json({ status: 'failed' });
  }

  const success = await checkSessionToken(sessionToken);
  if (!success) {
    return res.json({ status: 'failed' });
  } else {
    return res.json({ status: 'success' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session_token;
  if (!sessionToken) {
    return res.json({ status: 'failed', error: 'No session token found' });
  }

  try {
    // Revoke the session in Stytch
    await stytchClient.sessions.revoke({ session_token: sessionToken });
    await db.invalidateSession(sessionToken);

    res.clearCookie(SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({ status: 'failed', error: 'Error logging out' });
  }
});

export { authRouter, authenticate, getUserFromSessionToken };
