import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/upload": { target: "http://127.0.0.1:5050", changeOrigin: true, secure: false },
      "/stats": { target: "http://127.0.0.1:5050", changeOrigin: true, secure: false },
    },
  },
  resolve: { alias: { "@": "/src" } },
});
