"use client";

import { ApiError, signupWithApi } from "@/lib/api";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const emptyForm = {
  companyName: "",
  sector: "",
  country: "",
  adminName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signupWithApi({
        companyName: form.companyName,
        sector: form.sector,
        country: form.country,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
      });

      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (login?.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          "Cannot reach the backend. Check that FastAPI is running on NEXT_PUBLIC_API_URL.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef5f1] px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-md">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Verdustry
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Create company account</h1>
        <p className="mt-1 text-sm text-slate-700">
          Register your company and an administrator account to access the platform.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-semibold text-slate-800">
              Company name
            </label>
            <input
              id="companyName"
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="sector" className="block text-sm font-semibold text-slate-800">
              Sector
            </label>
            <input
              id="sector"
              value={form.sector}
              onChange={(e) => update("sector", e.target.value)}
              className="input mt-1"
              placeholder="e.g. Manufacturing"
              required
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-semibold text-slate-800">
              Country
            </label>
            <input
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className="input mt-1"
              placeholder="e.g. Tunisia"
              required
            />
          </div>

          <div className="sm:col-span-2 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-900">Administrator account</p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="adminName" className="block text-sm font-semibold text-slate-800">
              Full name
            </label>
            <input
              id="adminName"
              value={form.adminName}
              onChange={(e) => update("adminName", e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="input mt-1"
              minLength={6}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-800">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className="input mt-1"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-700 sm:col-span-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:col-span-2"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-800 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
