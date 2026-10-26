import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import visualizer from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const moduleId = id.replace(/\\/g, "/");

          if (
            moduleId.includes("/node_modules/@firebase/firestore/") ||
            moduleId.includes("/node_modules/@firebase/webchannel-wrapper/")
          ) {
            return "firebase-firestore";
          }

          if (moduleId.includes("/node_modules/@firebase/auth/")) {
            return "firebase-auth";
          }

          if (
            moduleId.includes("/node_modules/react/") ||
            moduleId.includes("/node_modules/react-dom/") ||
            moduleId.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    visualizer.default({
      // Use .default here
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
