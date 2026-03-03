// utils/permissions.ts

import { UserType } from "../types";

export function canPostOnBehalf(user: UserType | null | undefined): boolean {
  if (!user) return false;

  return ["admin", "super-admin", "supervisor"].includes(user.role);
}
