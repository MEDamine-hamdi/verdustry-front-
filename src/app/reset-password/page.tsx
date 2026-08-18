"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordApi, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Lien invalide ou expiré. Refaites une demande de réinitialisation.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Accès plateforme
        </div>
        <h1 className="text-[26px]">Nouveau mot de passe</h1>
        <p className="mb-7 mt-1.5 text-[13.5px] text-[var(--text-soft)]">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        {error && (
          <div className="mb-4.5 flex items-start gap-2.5 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="rounded-[9px] border border-[var(--line)] bg-white px-3.5 py-3 text-[13px] text-[var(--text-soft)]">
            Mot de passe réinitialisé avec succès. Redirection vers la connexion…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="input-field"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="mb-5.5">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="input-field"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Enregistrement…" : "Réinitialiser →"}
            </button>
          </form>
        )}

        <div className="mt-5.5 text-center text-[12.5px]">
          <a href="/login" className="font-semibold text-[var(--moss-dark)] hover:underline">
            ← Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-slate-800">
          Chargement…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}