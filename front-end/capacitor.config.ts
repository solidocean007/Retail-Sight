/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor/push-notifications" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Provisional until the organization confirms ownership of the store ID.
  appId: "com.displaygram.app",
  appName: "Displaygram",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    FirebaseAuthentication: {
      // Google uses the native account chooser, then the returned credential
      // signs in through the Firebase JS SDK used by Firestore and Functions.
      skipNativeAuth: true,
      providers: ["google.com"],
    },
    PushNotifications: {
      presentationOptions: ["sound", "alert"],
    },
  },
};

export default config;
