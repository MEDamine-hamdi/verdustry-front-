"use client";

import { FormEvent, useState } from "react";
import { forgotPasswordApi, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPasswordApi(email);
      setSent(true);
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
        <h1 className="text-[26px]">Mot de passe oublié</h1>
        <p className="mb-7 mt-1.5 text-[13.5px] text-[var(--text-soft)]">
          Entrez votre adresse email, nous vous enverrons un lien de réinitialisation.
        </p>

        {error && (
          <div className="mb-4.5 flex items-start gap-2.5 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {sent ? (
          <div className="rounded-[9px] border border-[var(--line)] bg-white px-3.5 py-3 text-[13px] text-[var(--text-soft)]">
            Si cette adresse existe, un lien de réinitialisation a été envoyé. Vérifiez votre boîte
            mail.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-5.5">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--text-soft)]">
                Adresse email professionnelle
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@entreprise.tn"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Envoi…" : "Envoyer le lien →"}
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