import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // relative asset paths so the build works at any URL, including GitHub Pages subpaths
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
