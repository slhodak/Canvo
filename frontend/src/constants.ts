export const SERVER_URL = import.meta.env.PROD ? import.meta.env.VITE_SERVER_DOMAIN : 'http://localhost:3000'
export const STYTCH_PUBLIC_TOKEN = import.meta.env.PROD ? import.meta.env.VITE_STYTCH_PUBLIC_TOKEN_PROD : import.meta.env.VITE_STYTCH_PUBLIC_TOKEN_TEST;
