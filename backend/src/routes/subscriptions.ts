import { authenticate, getUserFromSessionToken } from "./auth";
import { Router, Request, Response } from 'express';
import { Database as db } from '../db';

const subscriptionRouter = Router();
subscriptionRouter.use('/', authenticate);

// Returns the subscription and the plan
subscriptionRouter.get('/get_subscription', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: 'failed', error: "Could not find user email from session token" });
  }

  const highestSubscription = await db.getHighestSubscription(user.userId);
  if (highestSubscription) {
    const plan = await db.getPlan(highestSubscription.planId);
    if (!plan) {
      return res.status(500).json({ status: 'failed', error: "Could not find plan for subscription" });
    }
    return res.json({
      status: 'success',
      subscription: highestSubscription,
      plan,
    });
  }

  return res.status(500).json({ status: 'failed', error: "Could not find subscription for user" });
});

subscriptionRouter.get('/get_plan', async (req: Request, res: Response) => {
  const planId = req.params.planId;
  const plan = await db.getPlan(planId);
  if (!plan) {
    return res.status(404).json({ error: "Could not find plan" });
  }

  return res.json({ status: 'success', plan });
});

subscriptionRouter.get('/get_plans', async (req: Request, res: Response) => {
  // Return all plans
  return res.json({ status: 'success', plans: [] })
})

subscriptionRouter.post('/update_subscription', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user email from session token" });
  }

  const { subscription } = req.body;
  await db.updateSubscription(subscription);

  return res.json({ status: 'success' });
});

export { subscriptionRouter };
