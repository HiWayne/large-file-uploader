import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],
    base:
      env.VITE_NODE_ENV === "production" ? "/large-file-uploader/site/" : "/",
    server: {
      port: 9590,
      open: true,
    },
    build: {
      outDir: "./site",
    },
  };
});
