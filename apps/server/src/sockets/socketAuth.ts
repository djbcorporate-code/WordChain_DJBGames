import { AuthSession } from '@wordchain/shared';
import { Socket } from 'socket.io';
import { verifyJwt } from '../utils/security.js';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: AuthSession;
    roomId?: string;
  };
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  try {
    let token: string | undefined = socket.handshake.auth?.token;

    // If token not in auth payload, parse from cookie header
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') {
          token = decodeURIComponent(value);
          break;
        }
      }
    }

    if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      // Allow testing bypass only when explicitly provided in test environment
      if (process.env.NODE_ENV === 'test' && socket.handshake.auth?.testUser) {
        socket.data.user = socket.handshake.auth.testUser;
        return next();
      }
      return next(new Error('Authentication required. Please log in before connecting to multiplayer rooms.'));
    }

    const session = verifyJwt<AuthSession>(token);
    if (!session) {
      return next(new Error('Invalid or expired authentication session.'));
    }

    if (session.role === 'BANNED') {
      return next(new Error('This scholar account is suspended. Access denied.'));
    }

    socket.data.user = session;
    next();
  } catch (err: any) {
    next(new Error(err.message || 'Authentication error'));
  }
}
