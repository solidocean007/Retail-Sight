import { getApiBaseUrl } from "../getApiBase";

// utils/api.ts
export async function checkUserExists(email: string) {
  const resp = await fetch(`${getApiBaseUrl()}/checkUserExists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // include auth if your API checks it:
    // headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) throw new Error(`checkUserExists failed (${resp.status})`);
  return resp.json() as Promise<{ exists: boolean; uid?: string }>;
}
