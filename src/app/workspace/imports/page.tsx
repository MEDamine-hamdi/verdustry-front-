"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  importSuppliersOdoo,
  previewSql,
  ApiError,
  type ImportLog,
} from "@/lib/api";
import {
  parseBilanCarboneCsv,
  parseBilanCarboneRows,
  parseBilanCarboneApiResponse,
  storeBilanCarboneImport,
  BilanCarboneImportError,
} from "@/lib/bilanCarboneImport";

type ImportType = "excel" | "csv" | "sql" | "url" | "odoo";

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

const TYPE_LABELS: Record<ImportType, string> = {
  excel: "Excel",
  csv: "CSV",
  sql: "Base SQL",
  url: "API REST",
  odoo: "ERP (Odoo)",
};

export default function WorkspaceImportsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;
  const router = useRouter();

  const [importType, setImportType] = useState<ImportType>("excel");

  // Excel/CSV
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SQL
  const [connectionUrl, setConnectionUrl] = useState("");
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT category, quantity, period, site FROM bilan_carbone_data",
  );

  // API
  const [apiUrl, setApiUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lastLog, setLastLog] = useState<ImportLog | null>(null);
  const [history, setHistory] = useState<ImportLog[]>([]);

  async function handleImport() {
    if (!token || !companyId) return;
    setUploading(true);
    setError("");
    try {
      if (importType === "odoo") {
        const log = await importSuppliersOdoo(token, { companyId });
        setLastLog(log);
        setHistory((h) => [log, ...h]);
        setUploading(false);
        return;
      }

      // Tous les autres types alimentent Bilan carbone directement, puis redirigent.
      if (importType === "csv") {
        if (!file) throw new BilanCarboneImportError("Sélectionnez un fichier.");
        const text = await file.text();
        const payload = parseBilanCarboneCsv(text);
        storeBilanCarboneImport(payload);
      } else if (importType === "excel") {
        if (!file) throw new BilanCarboneImportError("Sélectionnez un fichier.");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string | number>[];
        const payload = parseBilanCarboneRows(rows);
        storeBilanCarboneImport(payload);
      } else if (importType === "sql") {
        if (!connectionUrl || !sqlQuery) {
          throw new BilanCarboneImportError("Renseignez l'URL de connexion et la requête SQL.");
        }
        const { rows } = await previewSql(token, { connectionUrl, query: sqlQuery });
        const payload = parseBilanCarboneRows(rows);
        storeBilanCarboneImport(payload);
      } else if (importType === "url") {
        if (!apiUrl) throw new BilanCarboneImportError("Renseignez l'URL de l'API.");
        const res = await fetch(apiUrl, {
          headers: authHeader ? { Authorization: authHeader } : undefined,
        });
        if (!res.ok) throw new BilanCarboneImportError(`Erreur API (${res.status})`);
        const json = await res.json();
        const payload = parseBilanCarboneApiResponse(json);
        storeBilanCarboneImport(payload);
      }

      setUploading(false);
      router.push("/workspace/openlca");
    } catch (e) {
      if (e instanceof BilanCarboneImportError) setError(e.message);
      else setError(e instanceof ApiError ? e.message : "Erreur lors de l'import");
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
          Importez vos données de bilan carbone (par poste : électricité, transport, déchets…)
          depuis un fichier, une base SQL, une API REST — vous serez redirigé automatiquement
          vers Bilan carbone avec tous les champs pré-remplis. L&apos;import Odoo reste dédié aux
          fournisseurs.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["excel", "csv", "sql", "url", "odoo"] as ImportType[]).map((t) => (
          <button
            key={t}
            onClick={() => setImportType(t)}
            className={`btn btn-sm ${importType === t ? "btn-primary" : ""}`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="card mb-5">
        <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
          Nouvel import — {TYPE_LABELS[importType]}
        </div>

        {(importType === "excel" || importType === "csv") && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
              Fichier ({importType === "excel" ? ".xlsx, .xls" : ".csv"})
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={importType === "excel" ? ".xlsx,.xls" : ".csv"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input-field"
            />
            <p className="mt-2 text-[11.5px] text-[var(--text-faint)]">
              Colonnes attendues : <code>category</code> (ex: electricity, waste,
              upstream_freight…), <code>quantity</code>, <code>period</code>, <code>site</code>{" "}
              (optionnel).
            </p>
          </div>
        )}

        {importType === "sql" && (
          <>
            <div className="mb-3.5">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                URL de connexion (PostgreSQL, MySQL...)
              </label>
              <input
                className="input-field"
                placeholder="postgresql://user:password@host:5432/database"
                value={connectionUrl}
                onChange={(e) => setConnectionUrl(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                Requête SQL (SELECT uniquement)
              </label>
              <textarea
                className="input-field font-mono text-[12.5px]"
                rows={3}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
              <p className="mt-2 text-[11.5px] text-[var(--text-faint)]">
                La requête doit retourner les colonnes : <code>category</code>,{" "}
                <code>quantity</code>, <code>period</code>, <code>site</code> (optionnel).
              </p>
            </div>
          </>
        )}

        {importType === "url" && (
          <>
            <div className="mb-3.5">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                URL de l&apos;API REST
              </label>
              <input
                className="input-field"
                placeholder="https://api.exemple.com/bilan-carbone"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                En-tête d&apos;authentification (optionnel)
              </label>
              <input
                className="input-field"
                placeholder="Bearer votre_token"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
              />
              <p className="mt-2 text-[11.5px] text-[var(--text-faint)]">
                La réponse JSON doit contenir une liste (ou un champ <code>data</code>/
                <code>results</code>/<code>items</code>) avec les champs <code>category</code>,{" "}
                <code>quantity</code>, <code>period</code>.
              </p>
            </div>
          </>
        )}

        {importType === "odoo" && (
          <div className="mb-4">
            <p className="text-[13px] text-[var(--text-soft)]">
              Importe les contacts entreprises (fournisseurs) depuis votre instance Odoo
              connectée. Aucune configuration nécessaire — la connexion utilise les identifiants
              définis côté serveur.
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--text-faint)]">
              Les fournisseurs importés seront ajoutés avec leur nom et pays d&apos;origine. Ne
              redirige pas vers Bilan carbone (données fournisseurs, pas émissions).
            </p>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleImport} disabled={uploading}>
          {uploading
            ? "Import en cours…"
            : importType === "odoo"
              ? "Importer"
              : "Importer et aller au Bilan carbone"}
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