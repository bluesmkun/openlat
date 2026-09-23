import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": import.meta.dirname + "/src" } },
  build: { chunkSizeWarningLimit: 900 },
  server: { proxy: { "/api": { target: "http://127.0.0.1:9911", ws: true } } },
})
