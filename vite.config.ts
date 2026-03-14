import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    {
      name: "serve-prototypes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const match = req.url?.match(/^\/([1-5])\/?$/);
          if (match) {
            const file = path.resolve("public", match[1], "index.html");
            if (fs.existsSync(file)) {
              res.setHeader("Content-Type", "text/html");
              fs.createReadStream(file).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
    react(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
