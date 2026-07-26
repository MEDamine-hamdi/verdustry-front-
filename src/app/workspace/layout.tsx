import { auth } from "@/auth";
import { redirect } from "next/navigation";
import WorkspaceSidebar from "@/components/workspace/sidebar";
import Topbar from "@/components/admin/topbar";

const ALLOWED_ROLES = ["ESG_MANAGER", "EXECUTIVE", "AUDITOR"];

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <WorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar breadcrumb="Espace entreprise" />
        <div className="max-w-[1220px] px-7.5 py-6.5 pb-16">{children}</div>
      </div>
    </div>
  );
}