const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 3000;

// 1. Servir el frontend estático PRIMERO (HTML, CSS, JS)
app.use(express.static(__dirname));

// 2. Proxy SOLO para las rutas /api
app.use(
  createProxyMiddleware({
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
    secure: true,
    pathFilter: "/api/**", // <-- ESTO ES LA MAGIA: Solo redirige si empieza con /api
    logLevel: "debug",
  })
);

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
