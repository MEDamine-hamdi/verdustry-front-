export const ROLES = [
  "EXECUTIVE",
  "ESG_MANAGER",
  "ADMIN",
  "AUDITOR",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  EXECUTIVE: "Direction",
  ESG_MANAGER: "Responsable ESG",
  ADMIN: "Administrateur",
  AUDITOR: "Auditeur",
};

/** Route par défaut après connexion, selon le rôle */
export const DEFAULT_ROUTE: Record<Role, string> = {
  ADMIN: "/admin/companies",
  ESG_MANAGER: "/workspace/dashboard",
  EXECUTIVE: "/workspace/dashboard",
  AUDITOR: "/workspace/dashboard",
};

export function canAccessRoute(role: Role, path: string): boolean {
  if (path.startsWith("/admin")) {
    return role === "ADMIN";
  }
  if (path.startsWith("/workspace")) {
    return role === "ESG_MANAGER" || role === "EXECUTIVE" || role === "AUDITOR";
  }
  return true;
}