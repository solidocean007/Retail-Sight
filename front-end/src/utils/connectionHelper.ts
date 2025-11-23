import { PendingBrandType } from "./types";

export function getProposerCompanyId(p: PendingBrandType): string {
  return typeof p.proposedBy === "string"
    ? p.proposedBy
    : p.proposedBy.companyId;
}

export function getProposerName(p: PendingBrandType): string {
  if (typeof p.proposedBy === "string") return "Unknown user";

  const u = p.proposedBy;
  return (
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
    u.email ||
    "Unknown user"
  );
}
