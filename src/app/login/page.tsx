import LoginForm from "@/app/login/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#eef5f1] text-slate-800">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
