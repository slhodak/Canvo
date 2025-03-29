import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from 'path';
import { ALLOWED_ORIGIN, FRONTEND_DOMAIN, port } from "./constants";
import { authRouter } from "./routes/auth";
import { subscriptionRouter } from "./routes/subscriptions";
import { aiRouter } from "./routes/ai";
import { tokenRouter } from "./routes/token";
import { apiRouter } from "./routes/api";
import { createWebSocketServer } from "./websockets";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const app: Express = express();

// Middleware
app.use(cookieParser());

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: "GET, POST, OPTIONS, PUT, DELETE",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://www.canvo.app'],
      connectSrc: ["'self'", 'https://www.canvo.app', 'wss://www.canvo.app', 'https://*.stytch.com'],
      imgSrc: ["'self'", 'https://www.canvo.app', 'https://*.stytch.com']
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());

// Serve React App
if (process.env.NODE_ENV == 'development') {
  app.get('/', (req: Request, res: Response) => {
    // When the app is running in development mode, the frontend is served by Vite
    res.redirect(FRONTEND_DOMAIN)
  });
} else {
  const frontendPath = process.env.FRONTEND_PATH;
  if (!frontendPath) {
    throw new Error('Cannot start production server: FRONTEND_PATH is not set');
  }
  app.use(express.static(frontendPath));

  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// Routes
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/ai', aiRouter);
app.use('/token', tokenRouter);
app.use('/sub', subscriptionRouter);

// Start Server
const { server, websocketClients } = createWebSocketServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

export { app, server, websocketClients };
