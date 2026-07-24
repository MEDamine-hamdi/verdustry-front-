import type { Role } from "@/lib/roles";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: Role;
    companyId?: string;
    accessToken?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      companyId?: string;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    companyId?: string;
    accessToken?: string;
  }
}
