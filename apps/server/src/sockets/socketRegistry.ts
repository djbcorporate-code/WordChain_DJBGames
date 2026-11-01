import { Server } from 'socket.io';

let activeIo: Server | null = null;

export function setIoServer(io: Server): void {
  activeIo = io;
}

export function getIoServer(): Server | null {
  return activeIo;
}
