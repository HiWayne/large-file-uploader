import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/large-file-uploader/site/',
  server: {
    port: 9590,
    open: true,
  },
  build: {
    outDir: './site'
  },
});
