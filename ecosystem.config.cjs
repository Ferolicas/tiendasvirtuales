// Configuración PM2 estándar del holding.
// `pnpm start` ejecuta `node dist/server.cjs` (Next.js + Socket.IO) leyendo
// process.env.PORT.
module.exports = {
  apps: [
    {
      name: "tiendasvirtuales",
      cwd: "/var/www/tiendasvirtuales",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
      },
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "512M",
    },
  ],
};
