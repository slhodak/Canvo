import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.ENV}` });

export const SERVER_URL = process.env.VITE_SERVER_DOMAIN;
export const AI_SERVICE_URL = process.env.VITE_AI_SERVICE_DOMAIN;
export const STYTCH_PUBLIC_TOKEN = process.env.VITE_STYTCH_PUBLIC_TOKEN
export const APP_DOMAIN = process.env.PROD ? "canvo.app" : "";
