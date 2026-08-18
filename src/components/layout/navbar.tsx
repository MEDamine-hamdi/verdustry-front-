"use client";

import { ROLE_LABELS } from "@/lib/roles";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <header className="border-b border-emerald-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-emerald-900">
            ESG Platform
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-800 hover:text-emerald-800">
              Dashboard
            </Link>
            {role === "ADMIN" && (
              <Link href="/admin/users" className="text-slate-800 hover:text-emerald-800">
                Users
              </Link>
            )}
          </nav>
        </div>
        {session?.user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-slate-800">
              {session.user.name}{" "}
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
                {role ? ROLE_LABELS[role] : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-900"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
