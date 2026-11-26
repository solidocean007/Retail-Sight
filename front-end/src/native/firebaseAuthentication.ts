import { registerPlugin } from "@capacitor/core";
import type { FirebaseAuthenticationPlugin } from "@capacitor-firebase/authentication";

// Register the installed native plugin without importing its optional web
// adapter. This keeps native Google authentication out of the browser bundle.
export const NativeFirebaseAuthentication =
  registerPlugin<FirebaseAuthenticationPlugin>("FirebaseAuthentication");
