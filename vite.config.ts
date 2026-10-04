import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // O dev server fica restrito a localhost de propósito: expor na rede
  // (host 0.0.0.0) abre o servidor de desenvolvimento para qualquer máquina da rede.
  server: {
    port: 8080,
  },
  preview: {
    port: 4173,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
  },
});
