import { Router, Request, Response, NextFunction } from "express";
import { authenticate, getUserFromSessionToken } from "./auth";
import { Database as db } from '../db';
import { CHAT_COST, EMBEDDING_COST, PROMPT_COST, SEARCH_COST, SUMMARIZE_COST, AI_SERVICE_URL } from '../constants';
import { runSimpleChat, runPrompt, summarize } from '../llm';
import { broadcastBalanceUpdate } from '../util';
import { LLMResponse, TransactionType } from 'wc-shared';
import { websocketClients } from '../app';

const aiRouter = Router();
aiRouter.use('/', authenticate);
aiRouter.use('/', (req: Request, res: Response, next: NextFunction) => {
  console.debug(`Request: ${req.method} ${req.url}`);
  next();
});

aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    const { projectId, nodeId, messages, brevity } = req.body;
    if (!projectId || !nodeId || !messages || brevity === undefined) {
      return res.status(400).json({ status: "failed", error: "No projectId or nodeId or messages or brevity provided" });
    }

    // Check token balance
    const tokenBalance = await db.getUserTokenBalance(user.userId);
    if (tokenBalance === null || tokenBalance < CHAT_COST) {
      return res.status(403).json({ status: "failed", error: "Insufficient tokens for this prompt", cost: CHAT_COST, balance: tokenBalance });
    }

    // TODO: Validate messages payload
    const result = await runSimpleChat(messages, brevity);
    await db.deductTokens(user.userId, CHAT_COST);
    broadcastBalanceUpdate(user.userId, tokenBalance - CHAT_COST, websocketClients);
    await db.logTokenTransaction(user.userId, CHAT_COST, TransactionType.Spend);
    return res.json({ status: "success", result });
  } catch (error) {
    console.error('Error running chat:', error);
    if (error instanceof Error) {
      return res.status(500).json({ status: "failed", error: error.message });
    }
    return res.status(500).json({ status: "failed", error: "An unknown error occurred" });
  }
});

aiRouter.post('/run_prompt', async (req: Request, res: Response) => {
  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance === null || tokenBalance < PROMPT_COST) {
    return res.status(403).json({ status: "failed", error: "Insufficient tokens" });
  }

  const { projectId, nodeId, prompt, input } = req.body;
  if (!projectId || !nodeId || !prompt || !input) {
    return res.status(400).json({ status: "failed", error: "No projectId or nodeId or prompt or input provided" });
  }

  const result = await runPrompt(prompt, input);
  await db.deductTokens(user.userId, PROMPT_COST);
  broadcastBalanceUpdate(user.userId, tokenBalance - PROMPT_COST, websocketClients);
  await db.logTokenTransaction(user.userId, PROMPT_COST, TransactionType.Spend);
  return res.json({ status: "success", result });
});

// TODO: Refactor this with other fixed-cost AI functions. One endpoint with different commands
aiRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSessionToken(req);
    if (!user) {
      return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
    }

    // Check token balance
    const tokenBalance = await db.getUserTokenBalance(user.userId);
    if (tokenBalance === null || tokenBalance < PROMPT_COST) {
      return res.status(403).json({ status: "failed", error: "Insufficient tokens" });
    }

    const { projectId, nodeId, input } = req.body;
    if (!projectId || !nodeId || !input) {
      return res.status(400).json({ status: "failed", error: "No projectId or nodeId or input provided" });
    }

    const result = await summarize(input);
    await db.deductTokens(user.userId, SUMMARIZE_COST);
    broadcastBalanceUpdate(user.userId, tokenBalance - SUMMARIZE_COST, websocketClients);
    await db.logTokenTransaction(user.userId, SUMMARIZE_COST, TransactionType.Spend);
    return res.json({ status: "success", result });
  } catch (error) {
    console.error('Error summarizing:', error);
    return res.status(500).json({ status: "failed", error: "AI service error" });
  }
});

aiRouter.post('/embed', async (req: Request, res: Response) => {
  const { document_text, chunk_size, chunk_overlap } = req.body;
  if (!document_text) {
    return res.status(400).json({ status: "failed", error: "No document_text provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ status: "failed", error: "Could not find user from session token" });
  }

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance === null || tokenBalance < EMBEDDING_COST) {
    return res.status(403).json({ status: "failed", error: "Insufficient tokens" });
  }

  try {
    // Forward request to AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_text, chunk_size, chunk_overlap }),
    });

    const result = await aiResponse.json();

    // Deduct tokens after successful operation
    await db.deductTokens(user.userId, EMBEDDING_COST);
    broadcastBalanceUpdate(user.userId, tokenBalance - EMBEDDING_COST, websocketClients);
    await db.logTokenTransaction(user.userId, EMBEDDING_COST, TransactionType.Spend);

    return res.json(result);
  } catch (error) {
    console.error('Error in embed:', error);
    return res.status(500).json({ status: "failed", error: "AI service error" });
  }
});

aiRouter.post('/search', async (req: Request, res: Response) => {
  const { document_id, query, top_k, neighbors } = req.body;
  if (!document_id || !query || !top_k) {
    return res.status(400).json({ error: "No document_id or query or top_k provided" });
  }

  const user = await getUserFromSessionToken(req);
  if (!user) {
    return res.status(401).json({ error: "Could not find user from session token" });
  }

  // Check token balance
  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance === null || tokenBalance < SEARCH_COST) {
    return res.status(403).json({ status: "failed", error: "Insufficient tokens" });
  }

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id, query, top_k, neighbors }),
    });

    const result = await aiResponse.json() as LLMResponse;
    if (result.status !== "success") {
      return res.status(500).json({ status: "failed", error: "AI service error" });
    }

    // Deduct tokens after successful operation
    await db.deductTokens(user.userId, SEARCH_COST);
    broadcastBalanceUpdate(user.userId, tokenBalance - SEARCH_COST, websocketClients);
    await db.logTokenTransaction(user.userId, SEARCH_COST, TransactionType.Spend);

    return res.json(result);
  } catch (error) {
    console.error('Error in search:', error);
    return res.status(500).json({ status: "failed", error: "AI service error" });
  }
});

export { aiRouter };
