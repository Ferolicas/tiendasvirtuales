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

// Sala pública de catálogo: los visitantes del escaparate ven altas,
// cambios y bajas de productos al instante. Separada de store:* para no
// exponer eventos de pedidos (datos de compradores) a visitantes.
export function emitToCatalog(
  storeId: string,
  event: string,
  payload: unknown
): void {
  getIO()?.to(`catalog:${storeId}`).emit(event, payload);
}

// Sala por pedido: el cliente sigue su pedido en /o/[id] en tiempo real.
export function emitToOrder(
  orderId: string,
  event: string,
  payload: unknown
): void {
  getIO()?.to(`order:${orderId}`).emit(event, payload);
}
