import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

function normalizeProxyPrefix(value, fallback) {
  const normalized = String(value || fallback || "").trim();
  if (!normalized) return fallback;
  if (/^https?:\/\//i.test(normalized)) {
    const path = new URL(normalized).pathname.replace(/\/+$/, "");
    return path || fallback;
  }
  const trimmed = normalized.replace(/\/+$/, "").replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : fallback;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const apiPrefix = normalizeProxyPrefix(process.env.VITE_API_BASE_URL, "/api");
const aiPrefix = normalizeProxyPrefix(process.env.VITE_AI_BASE_URL, "/internal");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      [apiPrefix]: {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      // TODO(cloud-native-step-01): remove this legacy proxy after all backend
      // responses expose final public URLs without relying on local /uploads.
      "/uploads": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      "/static": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      [aiPrefix]: {
        target: process.env.VITE_AI_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        rewrite:
          aiPrefix === "/internal"
            ? undefined
            : (path) => path.replace(new RegExp(`^${escapeRegex(aiPrefix)}`), ""),
      },
    },
  },
});
