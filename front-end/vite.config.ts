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
      // Checkout requires live callable functions and cannot work offline.
      // Let the service worker runtime-cache it only after checkout is opened.
      .filter((fileName) => !/^assets\/dropin-[^/]+\.js$/.test(fileName))
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
  const isProduction =
    !isStaging &&
    (mode === "production" || env.VITE_DISPLAYGRAM_ENV === "production");

  if (
    isProduction &&
    !(
      process.env.VITE_FIREBASE_API_KEY?.trim() ||
      env.VITE_FIREBASE_API_KEY?.trim()
    )
  ) {
    throw new Error(
      "Production builds require VITE_FIREBASE_API_KEY in front-end/.env.production.local or the process environment.",
    );
  }

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
      offlineAssetManifest(),
      visualizer.default({
        // Use .default here
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  };
});
