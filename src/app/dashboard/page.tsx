import { auth } from "@/auth";
import AppShell from "@/components/layout/app-shell";
import { ROLE_LABELS } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-700">
        Welcome, {user.name} — {ROLE_LABELS[user.role]}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Role" value={ROLE_LABELS[user.role]} />
        <Card title="Email" value={user.email ?? ""} />
        <Card title="Company ID" value={user.companyId ?? "—"} />
      </div>

      <section className="mt-8 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Available modules</h2>
        <ul className="mt-3 list-inside list-disc text-sm text-slate-800">
          <li>Dashboard overview</li>
          {user.role === "ADMIN" && <li>User management</li>}
          {user.role === "AUDITOR" && <li>Read-only consultation</li>}
          {user.role === "ESG_MANAGER" && <li>ESG analysis workspace (coming soon)</li>}
          {user.role === "EXECUTIVE" && <li>Executive overview (coming soon)</li>}
        </ul>
      </section>
    </AppShell>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
