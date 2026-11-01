import { LexiconService } from '@wordchain/lexicon';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.js';
import { closeDb, getDb } from './db/index.js';
import { socketAuthMiddleware } from './sockets/socketAuth.js';
import { setupSocketRouter } from './sockets/socketRouter.js';

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

// Real-Time Authentication and Socket Event Routing
io.use(socketAuthMiddleware);
setupSocketRouter(io);

async function startServer() {
  try {
    console.log('[WordChain] Booting server runtime...');
    await getDb();
    console.log('[WordChain] Database and schema validated.');

    await LexiconService.getInstance().initialize();
    console.log('[WordChain] Lexicon Trie loaded into memory.');

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
