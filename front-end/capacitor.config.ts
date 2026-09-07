import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Provisional until the organization confirms ownership of the store ID.
  appId: "com.displaygram.app",
  appName: "Displaygram",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
