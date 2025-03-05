import humps from 'humps';
import { BaseNode, IOState } from "wc-shared";
import { v4 as uuidv4 } from 'uuid';
import { Database as db } from './db';

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
  const projectId = uuidv4();
  const project = await db.createProject(projectId, userId);
  // Create CSV Node
  return project;
}