import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import visualizer from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isStaging =
    mode === "staging" || env.VITE_DISPLAYGRAM_ENV === "staging";
  if (
    isStaging &&
    (!env.VITE_FIREBASE_PROJECT_ID ||
      env.VITE_FIREBASE_PROJECT_ID === "retail-sight")
  ) {
    throw new Error(
      "Staging builds require a separate VITE_FIREBASE_PROJECT_ID and cannot use retail-sight.",
    );
  }

  return {
    base: "/",
    plugins: [
      react(),
      visualizer.default({
        // Use .default here
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  };
});
