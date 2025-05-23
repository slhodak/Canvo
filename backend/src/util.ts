import humps from 'humps';
import { BaseNode, IOState, UserModel, TransactionType } from "wc-shared";
import { Database as db } from './db';
import { SUBSCRIPTION_PLANS } from './constants';
import { WebSocket } from 'ws';

// Check if a value is null or undefined
export function isNullOrUndefined(value: any): boolean {
  return value === null || value === undefined;
}

// Check if any value in an object is null or undefined. Throw an error naming the value if so.
export function checkAnyNullOrUndefined(object: Record<string, any>) {
  for (const key in object) {
    if (isNullOrUndefined(object[key])) {
      throw new Error(`Value is null or undefined: ${key}`);
    }
  }
}

// Convert input and output states to the correct PostgreSQL format
export const formatStateArray = (state: IOState) => {
  const { stringValue, numberValue } = state;
  return `{${stringValue ?? null}, ${numberValue ?? null}}`;
};

export const formatIntegerArray = (array: (number | null)[]) => {
  return `{${array.map(element => element ?? 'NULL').join(',')}}`;
};


export const validateNode = (node: BaseNode): boolean => {
  const {
    nodeId, projectId, name, label, display, type, inputs, outputs, coordinates,
    runType, cacheType, properties, outputState, inputTypes, indexSelections } = node;
  try {
    checkAnyNullOrUndefined({
      nodeId, projectId, name, label, display, type, inputs, outputs, coordinates,
      runType, cacheType, properties, outputState, inputTypes, indexSelections
    });
  } catch (error) {
    console.error(`A required field is missing from the node: ${error}`);
    return false;
  }
  return true;
}

// Convert column names from snake_case to camelCase
export const camelizeColumns = (data: any) => {
  var template = data[0];
  for (var prop in template) {
    var camel = humps.camelize(prop);
    if (!(camel in template)) {
      for (var i = 0; i < data.length; i++) {
        var d = data[i];
        d[camel] = d[prop];
        delete d[prop];
      }
    }
  }
}

export const createDefaultProject = async (userId: string) => {
  const project = await db.createProject(userId, 'Default');
  // Create CSV Node
  return project;
}

export const addUserTokens = async (user: UserModel) => {
  const userPlanTier = await db.getHighestPlanTier(user.userId);
  if (userPlanTier === null) {
    console.error(`No plan info found for user ${user.userId}, cannot add tokens`);
    return;
  }

  const userPlanRules = SUBSCRIPTION_PLANS[userPlanTier];
  if (userPlanRules === undefined) {
    console.error(`No plan rules found for tier ${userPlanTier}, cannot add tokens`);
    return;
  }

  const tokenBalance = await db.getUserTokenBalance(user.userId);
  if (tokenBalance === null) {
    console.warn(`No token balance found for user ${user.userId}, will initialize with ${userPlanRules.tokenAutoAddAmount * 3} tokens`);
    await db.addTokens(user.userId, userPlanRules.tokenAutoAddAmount * 3);
    await db.logTokenTransaction(user.userId, userPlanRules.tokenAutoAddAmount * 3, TransactionType.AutoAdd);
    return;
  }

  if (tokenBalance < userPlanRules.maxTokens) {
    const diff = userPlanRules.maxTokens - tokenBalance;
    const addAmount = diff > userPlanRules.tokenAutoAddAmount ? userPlanRules.tokenAutoAddAmount : diff;
    console.log(`Granting ${addAmount} tokens to user ${user.userId}`);
    await db.addTokens(user.userId, addAmount);
    await db.logTokenTransaction(user.userId, addAmount, TransactionType.AutoAdd);
  }
}

// Broadcast balance updates to specific users
export function broadcastBalanceUpdate(userId: string, balance: number, websocketClients: Map<WebSocket, { userId: string }>  ) {
  for (const [client, info] of websocketClients.entries()) {
    if (info.userId === userId) {
      client.send(JSON.stringify({ type: 'BALANCE_UPDATE', balance }));
    }
  }
}
