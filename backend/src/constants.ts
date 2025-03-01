export const port = 3000;

export const ALLOWED_ORIGIN = process.env.NODE_ENV == 'development' ? 'http://localhost:5173' : 'https://canvo.app';
export const JWT_SECRET = ((): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret === undefined) {
    throw new Error('Cannot start server: JWT_SECRET is not set');
  }
  return jwtSecret;
})();
export const sevenDaysInSeconds = 60 * 60 * 24 * 7;
export const SESSION_TOKEN = "session_token";

export const FRONTEND_DOMAIN = ((): string => {
  const frontendDomain = process.env.APP_DOMAIN;
  if (frontendDomain === undefined) {
    throw new Error('Cannot start server: APP_DOMAIN is not set');
  }
  return frontendDomain;
})();

export const AI_SERVICE_URL = ((): string => {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (aiServiceUrl === undefined) {
    throw new Error('Cannot start server: AI_SERVICE_URL is not set');
  }
  return aiServiceUrl;
})();

// Index = Tier
export const SUBSCRIPTION_PLANS = [
  {
    maxTokens: 100,
    tokenAutoAddAmount: 30,
  },
  {
    maxTokens: 500,
    tokenAutoAddAmount: 120,
  },
];
// Token costs for different operations
export const EMBEDDING_COST = 1;  // Cost per document embedded
export const SEARCH_COST = 1;    // Cost per search query
export const PROMPT_COST = 3;   // Cost per prompt run
export const CHAT_COST = 3;   // Cost per chat message

// Stytch Authentication
export const STYTCH_PROJECT_ID = ((): string => {
  const stytchProjectId = process.env.STYTCH_PROJECT_ID;
  if (stytchProjectId === undefined) {
    throw new Error('Cannot start server: STYTCH_PROJECT_ID is not set');
  }
  return stytchProjectId;
})();

export const STYTCH_SECRET = ((): string => {
  const stytchSecret = process.env.STYTCH_SECRET;
  if (stytchSecret === undefined) {
    throw new Error('Cannot start server: STYTCH_SECRET is not set');
  }
  return stytchSecret;
})();
