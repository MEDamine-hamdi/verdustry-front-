"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchBenchmark, ApiError, type BenchmarkResponse } from "@/lib/api";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const REFERENCE_LABELS: Record<string, string> = {
  sector_average: "Moyenne secteur",
  csrd: "Seuil CSRD",
  cbam: "Seuil CBAM",
  net_zero: "Trajectoire Net Zero",
  sbti: "Cible SBTi",
};

export default function BenchmarkPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token || !companyId) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchBenchmark(token, companyId);
      setData(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!companyId) {
    return (
      <div className="card">
        <p className="text-sm text-[var(--text-soft)]">
          Aucune entreprise n&apos;est associée à votre compte.
        </p>
      </div>
    );
  }

  const radarData = data?.items.map((item) => ({
    subject: REFERENCE_LABELS[item.referenceType] ?? item.referenceType,
    "Votre entreprise": data.companyTotalEmissions,
    Référence: item.referenceValue,
  }));

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Analyse
        </div>
        <h1 className="text-[25px]">Benchmark ESG</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Comparaison de vos émissions aux référentiels sectoriels, trajectoires Net Zero, SBTi
          et exigences réglementaires CSRD/CBAM.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--text-faint)]">Chargement…</div>
      ) : data ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="card">
              <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Vos émissions totales
              </div>
              <div className="mt-1.5 text-[26px] font-semibold text-[var(--ink)]">
                {data.companyTotalEmissions.toLocaleString("fr-FR")}{" "}
                <span className="text-[14px] font-normal text-[var(--text-faint)]">tCO2e</span>
              </div>
              <div className="mt-1 text-[12px] text-[var(--text-faint)]">
                Secteur : {data.sector}
              </div>
            </div>
            <div className="card">
              <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Écarts positifs / négatifs
              </div>
              <div className="mt-1.5 flex gap-4">
                <div>
                  <span className="text-[20px] font-semibold text-[var(--moss-dark)]">
                    {data.items.filter((i) => i.gapValue <= 0).length}
                  </span>
                  <span className="ml-1 text-[12px] text-[var(--text-faint)]">sous la cible</span>
                </div>
                <div>
                  <span className="text-[20px] font-semibold text-[#8a3320]">
                    {data.items.filter((i) => i.gapValue > 0).length}
                  </span>
                  <span className="ml-1 text-[12px] text-[var(--text-faint)]">au-dessus</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-5">
            <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
              Comparaison radar
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e1e4dc" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Votre entreprise"
                  dataKey="Votre entreprise"
                  stroke="#1f6d46"
                  fill="#1f6d46"
                  fillOpacity={0.35}
                />
                <Radar
                  name="Référence"
                  dataKey="Référence"
                  stroke="#c97a2a"
                  fill="#c97a2a"
                  fillOpacity={0.15}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
              Détail des écarts
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                    Référentiel
                  </th>
                  <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                    Valeur cible
                  </th>
                  <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                    Écart
                  </th>
                  <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.referenceType}>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      {item.label ?? REFERENCE_LABELS[item.referenceType]}
                      {item.year && (
                        <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">
                          ({item.year})
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      {item.referenceValue.toLocaleString("fr-FR")} {item.unit}
                    </td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      {item.gapValue > 0 ? "+" : ""}
                      {item.gapValue.toLocaleString("fr-FR")} {item.unit} ({item.gapPercent > 0 ? "+" : ""}
                      {item.gapPercent}%)
                    </td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      <span className={item.gapValue <= 0 ? "badge badge-active" : "badge badge-inactive"}>
                        {item.gapValue <= 0 ? "Conforme" : "Écart"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}