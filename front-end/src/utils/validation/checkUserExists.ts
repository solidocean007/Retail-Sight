// utils/validation/checkUserExists.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function checkUserExists(email: string): Promise<boolean> {
  const fn = httpsCallable<{ email: string }, { exists: boolean }>(
    functions,
    "checkUserExists" // 👈 name matches your deployed Gen2 function
  );

  const res = await fn({ email });
  return res.data.exists;
}

