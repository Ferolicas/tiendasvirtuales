import type { Server } from "socket.io";

// El servidor custom (server.ts) registra la instancia de Socket.IO en
// globalThis para que los route handlers (mismo proceso) puedan emitir.
const globalForIO = globalThis as unknown as { __io?: Server };

export function getIO(): Server | null {
  return globalForIO.__io ?? null;
}

export function emitToStore(
  storeId: string,
  event: string,
  payload: unknown
): void {
  getIO()?.to(`store:${storeId}`).emit(event, payload);
}
