"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmailApi, ApiError } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien invalide ou incomplet.");
      return;
    }

    verifyEmailApi(token)
      .then(() => {
        setStatus("success");
        setMessage("Votre adresse email a été vérifiée avec succès.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Lien invalide ou expiré.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-10">
      <div className="w-full max-w-[380px] text-center">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Accès plateforme
        </div>
        <h1 className="text-[26px]">Vérification de l&apos;email</h1>

        <div className="mt-6">
          {status === "loading" && (
            <p className="text-[13.5px] text-[var(--text-soft)]">Vérification en cours…</p>
          )}
          {status === "success" && (
            <div className="rounded-[9px] border border-[var(--line)] bg-white px-3.5 py-3 text-[13px] text-[var(--text-soft)]">
              {message}
            </div>
          )}
          {status === "error" && (
            <div className="rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-3 text-[13px] text-[#8a3320]">
              {message}
            </div>
          )}
        </div>

        <div className="mt-5.5">
          <a href="/login" className="font-semibold text-[13px] text-[var(--moss-dark)] hover:underline">
            ← Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-slate-800">
          Chargement…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}