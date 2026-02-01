import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE || "http://localhost:3000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  test: {
    environment: "node"
  }
});
