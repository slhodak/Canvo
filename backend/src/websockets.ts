import http from 'http';
import { Server, WebSocket } from 'ws';
import { Express } from 'express';
import { Database as db } from './db';

export function createWebSocketServer(app: Express) {
  const server = http.createServer(app);
  const websocketClients = new Map<WebSocket, { userId: string }>();

  const wss = new Server({
    server,
    path: '/token/ws'
  });

  wss.on('error', (error) => {
    if (error instanceof Error) {
      console.error('WebSocket server error:', error.message);
    } else {
      console.error('WebSocket server error:', error);
    }
  })

  // Connection Event
  wss.on('connection', (ws) => {
    // console.log('Client connected');
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      // Handle different message types
      const data = JSON.parse(message);
      if (data.userId) {
        websocketClients.set(ws, { userId: data.userId });
        const balance = await db.getUserTokenBalance(data.userId);
        if (balance !== null) {
          ws.send(JSON.stringify({ type: 'CONNECTED', balance }));
        }
      }

      if (data.type === 'GET_BALANCE') {
        const userInfo = websocketClients.get(ws);
        if (userInfo) {
          const balance = await db.getUserTokenBalance(userInfo.userId);
          if (balance !== null) {
            ws.send(JSON.stringify({ type: 'BALANCE_UPDATE', balance }));
          }
        }
      }
    })

    ws.on('error', (error) => {
      if (error instanceof Error) {
        console.error('WebSocket error:', error.message);
      } else {
        console.error('WebSocket error:', error);
      }
    })

    // Handle disconnections
    ws.on('close', () => {
      websocketClients.delete(ws);
      // console.log('Client disconnected');
    })
  });

  return { server, websocketClients };
}
