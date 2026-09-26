import { Server } from 'socket.io';

let socketServer: Server | null = null;

export function initSockets(io: Server) {
  socketServer = io;
  io.on('connection', (socket) => {
    socket.on('join:stock', () => {
      socket.join('stock-room');
    });

    socket.on('join:dashboard', () => {
      socket.join('dashboard-room');
    });
  });
}

export function emitStockUpdate(payload: unknown) {
  socketServer?.to('stock-room').emit('stock.updated', payload);
}

export function emitDashboardUpdate(payload: unknown) {
  socketServer?.to('dashboard-room').emit('dashboard.updated', payload);
}

export function emitDocumentEvent(event: string, payload: unknown) {
  socketServer?.emit(event, payload);
}
