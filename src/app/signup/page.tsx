import SignupForm from "@/app/signup/signup-form";
import { Suspense } from "react";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef5f1] text-slate-800">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
