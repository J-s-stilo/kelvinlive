import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port,
  },

  preview: {
    host: "0.0.0.0",
    port,
    allowedHosts: ["kelvinlive.onrender.com"],
  },
});
