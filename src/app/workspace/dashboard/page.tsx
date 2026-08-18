"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchAggregate,
  fetchTrend,
  fetchTopEmitters,
  ApiError,
  type AggregateResponse,
  type TrendResponse,
  type TopEmittersResponse,
} from "@/lib/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#1f6d46", "#c97a2a", "#3a5a7a", "#b4442e", "#5b665f"];

export default function WorkspaceDashboardPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [groupBy, setGroupBy] = useState("scope");
  const [aggregate, setAggregate] = useState<AggregateResponse | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [topEmitters, setTopEmitters] = useState<TopEmittersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token || !companyId) return;
    setLoading(true);
    setError("");
    try {
      const [agg, tr, top] = await Promise.all([
        fetchAggregate(token, companyId, groupBy),
        fetchTrend(token, companyId),
        fetchTopEmitters(token, companyId),
      ]);
      setAggregate(agg);
      setTrend(tr);
      setTopEmitters(top);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  }, [token, companyId, groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          Analyse
        </div>
        <h1 className="text-[25px]">Aperçu système</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Analyse multidimensionnelle de vos émissions.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--text-faint)]">Chargement…</div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div className="card">
              <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Émissions totales
              </div>
              <div className="mt-1.5 text-[26px] font-semibold text-[var(--ink)]">
                {aggregate?.totalValue.toLocaleString("fr-FR") ?? "—"}{" "}
                <span className="text-[14px] font-normal text-[var(--text-faint)]">tCO2e</span>
              </div>
            </div>
            <div className="card">
              <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Évolution dernière période
              </div>
              <div
                className={`mt-1.5 text-[26px] font-semibold ${
                  (trend?.changePercent ?? 0) <= 0 ? "text-[var(--moss-dark)]" : "text-[#8a3320]"
                }`}
              >
                {trend?.changePercent !== undefined && trend.changePercent !== null
                  ? `${trend.changePercent > 0 ? "+" : ""}${trend.changePercent}%`
                  : "—"}
              </div>
            </div>
            <div className="card">
              <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Poste le plus émetteur
              </div>
              <div className="mt-1.5 text-[19px] font-semibold text-[var(--ink)]">
                {topEmitters?.items[0]?.category ?? "—"}
              </div>
              <div className="text-[12px] text-[var(--text-faint)]">
                {topEmitters?.items[0] ? `${topEmitters.items[0].percentOfTotal}% du total` : ""}
              </div>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="card">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--ink)]">
                  Répartition des émissions
                </div>
                <select
                  className="input-field w-auto py-1 text-[12px]"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                >
                  <option value="scope">Par scope</option>
                  <option value="category">Par catégorie</option>
                  <option value="site">Par site</option>
                  <option value="period">Par période</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={aggregate?.items ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e4dc" />
                  <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                    {(aggregate?.items ?? []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
                Évolution temporelle
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend?.points ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e4dc" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1f6d46"
                    strokeWidth={2.5}
                    dot={{ fill: "#1f6d46", r: 3.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
              Postes les plus émetteurs
            </div>
            {topEmitters && topEmitters.items.length > 0 ? (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                      Catégorie
                    </th>
                    <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                      Émissions
                    </th>
                    <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                      % du total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topEmitters.items.map((item, i) => (
                    <tr key={item.category}>
                      <td className="border-b border-[var(--line)] px-3 py-2.5">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {item.category}
                      </td>
                      <td className="border-b border-[var(--line)] px-3 py-2.5">
                        {item.totalValue.toLocaleString("fr-FR")} tCO2e
                      </td>
                      <td className="border-b border-[var(--line)] px-3 py-2.5">
                        {item.percentOfTotal}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded-[10px] border-[1.5px] border-dashed border-[var(--line)] p-6.5 text-center text-[13px] text-[var(--text-faint)]">
                Aucune donnée d&apos;émission pour le moment.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}