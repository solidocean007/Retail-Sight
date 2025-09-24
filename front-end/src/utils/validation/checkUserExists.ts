// utils/validation/checkUserExists.ts
import { getFunctions, httpsCallable } from "firebase/functions";

export async function checkUserExists(email: string): Promise<boolean> {
  const functions = getFunctions();
  const fn = httpsCallable<{ email: string }, { exists: boolean }>(
    functions,
    "checkUserExists" // 👈 name matches your deployed Gen2 function
  );

  const res = await fn({ email });
  return res.data.exists;
}

