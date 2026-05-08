import path from "path"
import { fileURLToPath } from "url"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const frontendPort = Number(env.VITE_PORT || 5174);
  const backendUrl = env.VITE_BACKEND_URL || "http://127.0.0.1:5152";

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
        ],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
})
