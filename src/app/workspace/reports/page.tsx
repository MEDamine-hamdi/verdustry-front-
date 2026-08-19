"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { downloadReport, ApiError } from "@/lib/api";

export default function ReportsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const companyId = session?.user?.companyId;

  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: "pdf" | "excel") {
    if (!token || !companyId) return;
    setDownloading(format);
    setError(null);
    try {
      await downloadReport(token, companyId, format);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le téléchargement a échoué.");
    } finally {
      setDownloading(null);
    }
  }

  const cards = [
    {
      format: "pdf" as const,
      title: "Rapport PDF",
      description:
        "Synthèse exécutive avec émissions par scope, cibles ESG et écarts de benchmark, prête à partager.",
    },
    {
      format: "excel" as const,
      title: "Export Excel",
      description:
        "Détail ligne par ligne des émissions, cibles et benchmark sur trois feuilles distinctes.",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[var(--ink)]">
          Rapports
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Générez un rapport conforme ESG/CSRD/CBAM/GRI à partir de vos données actuelles.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.format} className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">{c.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{c.description}</p>
            <button
              onClick={() => handleDownload(c.format)}
              disabled={downloading !== null}
              className="mt-4 rounded-lg bg-[var(--moss)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {downloading === c.format ? "Génération…" : "Télécharger"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}