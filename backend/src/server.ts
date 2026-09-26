import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import importRoutes from './routes/import.js';
import notificationRoutes from './routes/notification.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { initSockets } from './sockets/index.js';

const app = express();
const server = createServer(app);
const localDevelopmentOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];
const configuredFrontendOrigin = new URL(env.frontendUrl).origin;
const allowedFrontendOrigins = process.env.NODE_ENV === 'production'
  ? [configuredFrontendOrigin]
  : [...new Set([configuredFrontendOrigin, ...localDevelopmentOrigins])];
const io = new Server(server, {
  cors: { origin: allowedFrontendOrigins, methods: ['GET', 'POST'], credentials: true },
});

app.use(helmet());
app.use(cors({ origin: allowedFrontendOrigins, credentials: true }));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Health check database failure:', message);
    return res.status(503).json({ status: 'error', database: 'disconnected', error: message });
  }
});

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'StockSense API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:8000/api' }],
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api/auth', authRoutes);
app.use('/api', importRoutes);
app.use('/api', notificationRoutes);
app.use('/api', inventoryRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

initSockets(io);

app.use(errorHandler);

export { app, server, io };

if (process.env.NODE_ENV !== 'test') {
  server.listen(env.port, () => {
    console.log(`StockSense backend running on http://localhost:${env.port}`);
    console.log(`Swagger docs: http://localhost:${env.port}/api-docs`);
  });
}
