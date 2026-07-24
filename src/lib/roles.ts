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

/** Routes each role can access */
export const ROLE_ROUTES: Record<Role, string[]> = {
  EXECUTIVE: ["/dashboard"],
  ESG_MANAGER: ["/dashboard"],
  ADMIN: ["/dashboard", "/admin/users"],
  AUDITOR: ["/dashboard"],
};

export function canAccessRoute(role: Role, path: string): boolean {
  if (path.startsWith("/admin")) {
    return role === "ADMIN";
  }
  return true;
}
