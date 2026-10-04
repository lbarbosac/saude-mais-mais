import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

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
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Bibliotecas em arquivos próprios: mudam pouco entre deploys e
        // continuam no cache do navegador quando só o código do app muda.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            { name: "interface", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils|@radix-ui|@tanstack)[\\/]/ },
          ],
        },
      },
    },
  },
});
