"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { importEmissionsExcel, ApiError, type ImportLog } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  success: "Succès",
  partial: "Partiel",
  failed: "Échec",
  pending: "En cours",
};

const STATUS_CLASSES: Record<string, string> = {
  success: "badge-active",
  partial: "badge-role",
  failed: "badge-inactive",
  pending: "badge-inactive",
};

export default function WorkspaceImportsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lastLog, setLastLog] = useState<ImportLog | null>(null);
  const [history, setHistory] = useState<ImportLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!token || !file || !companyId) return;
    setUploading(true);
    setError("");
    try {
      const log = await importEmissionsExcel(token, companyId, file);
      setLastLog(log);
      setHistory((h) => [log, ...h]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  }

  if (!companyId) {
    return (
      <div className="card">
        <p className="text-sm text-[var(--text-soft)]">
          Aucune entreprise n&apos;est associée à votre compte. Contactez votre administrateur.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Données
        </div>
        <h1 className="text-[25px]">Intégration des données</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Importez vos données d&apos;émissions (Scope 1/2/3) depuis un fichier Excel ou CSV.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="card mb-5">
        <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
          Nouvel import — Excel / CSV
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
            Fichier (.xlsx, .xls, .csv)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input-field"
          />
          <p className="mt-2 text-[11.5px] text-[var(--text-faint)]">
            Colonnes attendues : <code>scope</code> (1/2/3), <code>value</code>, <code>unit</code>,{" "}
            <code>period</code>, et optionnellement <code>category</code>.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? "Import en cours…" : "Importer le fichier"}
        </button>
      </div>

      {lastLog && (
        <div className="card mb-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--ink)]">Résultat du dernier import</div>
            <span className={`badge ${STATUS_CLASSES[lastLog.status]}`}>
              {STATUS_LABELS[lastLog.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-[9px] border border-[var(--line)] p-3">
              <div className="text-[22px] font-semibold text-[var(--ink)]">{lastLog.rowsTotal ?? "—"}</div>
              <div className="text-[11px] text-[var(--text-faint)]">Lignes totales</div>
            </div>
            <div className="rounded-[9px] border border-[var(--line)] p-3">
              <div className="text-[22px] font-semibold text-[var(--moss-dark)]">
                {lastLog.rowsImported ?? "—"}
              </div>
              <div className="text-[11px] text-[var(--text-faint)]">Importées</div>
            </div>
            <div className="rounded-[9px] border border-[var(--line)] p-3">
              <div className="text-[22px] font-semibold text-[#8a3320]">{lastLog.rowsFailed ?? "—"}</div>
              <div className="text-[11px] text-[var(--text-faint)]">Échouées</div>
            </div>
          </div>
          {lastLog.errorMessage && (
            <div className="mt-3.5 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12px] text-[#8a3320]">
              {lastLog.errorMessage}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Historique des imports (session)
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Date
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Statut
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Lignes
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.id}>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {log.importedAt ? new Date(log.importedAt).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    <span className={`badge ${STATUS_CLASSES[log.status]}`}>
                      {STATUS_LABELS[log.status]}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {log.rowsImported}/{log.rowsTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}