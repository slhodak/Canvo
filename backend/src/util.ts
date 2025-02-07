import { IOState } from "../../shared/types/src/models/node";

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
