import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import visualizer from "rollup-plugin-visualizer";

const offlineAssetManifest = () => ({
  name: "displaygram-offline-asset-manifest",
  apply: "build" as const,
  generateBundle(
    _options: unknown,
    bundle: Record<string, { fileName: string }>,
  ) {
    const buildAssets = Object.values(bundle)
      .map(({ fileName }) => fileName)
      .filter((fileName) => !fileName.endsWith("stats.html"))
      .map((fileName) => `/${fileName}`);

    const assets = Array.from(
      new Set(["/", "/index.html", "/offline.html", ...buildAssets]),
    ).sort();

    this.emitFile({
      type: "asset",
      fileName: "offline-assets.json",
      source: JSON.stringify(assets),
    });
  },
});

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
      offlineAssetManifest(),
      visualizer.default({
        // Use .default here
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  };
});
