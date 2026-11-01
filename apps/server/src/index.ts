import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.js';
import { closeDb, getDb } from './db/index.js';

const PORT = Number(process.env.PORT) || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] New connection established: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Socket ${socket.id} disconnected: ${reason}`);
  });
});

async function startServer() {
  try {
    console.log('[WordChain] Booting server runtime...');
    await getDb();
    console.log('[WordChain] Database and schema validated.');

    server.listen(PORT, () => {
      console.log(`[WordChain] Server listening on http://localhost:${PORT}`);
      console.log(`[WordChain] Real-Time Socket.IO engine ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('[WordChain] Fatal server startup error:', error);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('\n[WordChain] Gracefully terminating server...');
  io.close();
  server.close(async () => {
    await closeDb();
    console.log('[WordChain] Server and database closed.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
