import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/sidebar";
import Topbar from "@/components/admin/topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar breadcrumb="Administration" />
        <div className="max-w-[1220px] px-7.5 py-6.5 pb-16">{children}</div>
      </div>
    </div>
  );
}