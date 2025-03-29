import { Router, Request, Response } from 'express';
import { Database as db } from '../db';
import { authenticate, getUserFromSessionToken } from "./auth";
import { addUserTokens, broadcastBalanceUpdate } from '../util';
import { TransactionType } from 'wc-shared';
import { websocketClients } from '../app';
import schedule from 'node-schedule';

// Cron Job to add tokens to users
const rule = new schedule.RecurrenceRule();
if (process.env.NODE_ENV === 'production') {
  rule.hour = [0, 3, 6, 9, 12, 15, 18, 21]; // Every 3 hours
  rule.minute = 0;
  rule.second = 0;
} else {
  rule.second = 0;
}
const job = schedule.scheduleJob(rule, async () => {
  const users = await db.getAllUsers();
  for (const user of users) {
    await addUserTokens(user);
    const tokenBalance = await db.getUserTokenBalance(user.userId);
    if (tokenBalance !== null) {
      broadcastBalanceUpdate(user.userId, tokenBalance, websocketClients);
    }
  }
});


const tokenRouter = Router();
tokenRouter.use('/', authenticate);

tokenRouter.post('/add', async (req: Request, res: Response) => {
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
    const tokenBalance = await db.getUserTokenBalance(user.userId);
    if (tokenBalance !== null) {
      broadcastBalanceUpdate(user.userId, tokenBalance, websocketClients);
    }
    await db.logTokenTransaction(user.userId, amount, TransactionType.Purchase);
    return res.json({ status: "success" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

tokenRouter.get('/get_balance', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    const tokenBalance = await db.getUserTokenBalance(user.userId);
    if (tokenBalance === null) {
      return res.status(404).json({ status: "failed", error: "No token balance found for user" });
    }

    return res.json({ status: "success", tokenBalance });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

export { tokenRouter };
