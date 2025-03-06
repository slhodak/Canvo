import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.ENV}` });

export const SERVER_URL = process.env.VITE_SERVER_DOMAIN;
