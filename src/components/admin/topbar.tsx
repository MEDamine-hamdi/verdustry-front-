"use client";

import { signOut, useSession } from "next-auth/react";

export default function Topbar({ breadcrumb }: { breadcrumb: string }) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "Admin";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-7 py-3.5">
      <div className="text-xs text-[var(--text-faint)]">{breadcrumb}</div>
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-sm"
        >
          Se déconnecter
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--moss-light)] font-[family-name:var(--font-fraunces)] text-[12.5px] font-bold text-[var(--moss-dark)]">
          {initials}
        </div>
      </div>
    </div>
  );
}