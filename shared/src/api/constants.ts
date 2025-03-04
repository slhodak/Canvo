import dotenv from 'dotenv';

const getEnvironment = () => {
  // Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env.ENV || 'development';
  }

  // Vite
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.ENV || 'development';
  }

  // Fallback
  return 'development';
}

const env = getEnvironment();

if (typeof process !== 'undefined' && process.env) {
  dotenv.config({ path: `.env.${env}` });
}

export const SERVER_URL = typeof process !== 'undefined' && process.env
  ? process.env.VITE_SERVER_DOMAIN
  : typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SERVER_DOMAIN
    : undefined;
