export const SOCKET_URL = `${import.meta.env.VITE_SOCKET_SCHEME}://${import.meta.env.VITE_SERVER_DOMAIN}`;
export const SERVER_URL = `${import.meta.env.VITE_SERVER_SCHEME}://${import.meta.env.VITE_SERVER_DOMAIN}`;
export const AI_SERVICE_URL = `${import.meta.env.VITE_AI_SERVICE_SCHEME}://${import.meta.env.VITE_AI_SERVICE_DOMAIN}`;
export const STYTCH_PUBLIC_TOKEN = import.meta.env.VITE_STYTCH_PUBLIC_TOKEN
export const APP_DOMAIN = import.meta.env.PROD ? "canvo.app" : "";
