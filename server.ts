import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handler(req, res);
  });

  const io = new Server(httpServer);
  (globalThis as unknown as { __io?: Server }).__io = io;

  io.on("connection", (socket) => {
    socket.on("store:join", (storeId: unknown) => {
      if (typeof storeId === "string" && storeId.length <= 64) {
        socket.join(`store:${storeId}`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `> tiendasvirtuales listo en http://localhost:${port} (${dev ? "dev" : "prod"})`
    );
  });
});
