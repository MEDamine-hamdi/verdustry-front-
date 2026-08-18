"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/roles";

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const navItems = [
    { href: "/workspace/dashboard", label: "Aperçu système" },
    { href: "/workspace/benchmark", label: "Benchmark ESG" },
    { href: "/workspace/anomalies", label: "Anomalies" },
    ...(role === "ESG_MANAGER"
      ? [
          { href: "/workspace/perimeter", label: "Périmètre (sites & fournisseurs)" },
          { href: "/workspace/imports", label: "Intégration des données" },
          { href: "/workspace/openlca", label: "Bilan carbone" },
        ]
      : []),
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[252px] flex-none flex-col overflow-y-auto bg-[var(--ink)] px-3.5 pb-4.5 pt-5.5 text-[#dfe8e2]">
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-white/10 px-2 pb-4.5">
        <svg viewBox="0 0 30 30" fill="none" className="h-7.5 w-7.5">
          <circle cx="15" cy="6" r="3" fill="#bfe8cf" />
          <circle cx="6" cy="22" r="3" fill="#6fa583" />
          <circle cx="24" cy="22" r="3" fill="#6fa583" />
          <path d="M15 9 L6 19 M15 9 L24 19 M6 22 L24 22" stroke="#3f6b53" strokeWidth="1.4" />
        </svg>
        <div>
          <div className="font-[family-name:var(--font-fraunces)] text-[16.5px] font-semibold leading-tight text-white">
            Verdustry
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-[#9db8a9]">
            Copilote ESG
          </div>
        </div>
      </div>

      <div className="mb-1">
        <div className="px-2.5 pb-1.5 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[#7d9689]">
          {role ? ROLE_LABELS[role] : "Espace"}
        </div>
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`my-0.5 flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[13.3px] transition-colors ${
                active
                  ? "bg-[var(--moss)] font-semibold text-white"
                  : "text-[#cddbd2] hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 flex-none rounded-full ${
                  active ? "bg-[#bfe8cf]" : "bg-[#5f7d6c]"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 border-t border-white/10 pl-2.5 pt-3.5 text-[11px] leading-relaxed text-[#7d9689]">
        Espace entreprise cliente
      </div>
    </aside>
  );
}