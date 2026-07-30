"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface AnomalyAlert {
  type: "unusual_spike" | "indicator_inconsistency";
  severity: "high" | "medium" | "low";
  period: string;
  message: string;
  value: number;
  score: number;
  details?: Record<string, any> | null;
}

interface AnomalySummary {
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface AnomalyResponse {
  alerts: AnomalyAlert[];
  summary: AnomalySummary;
}

const severityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-orange-50 text-orange-700 border-orange-200",
  low: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const severityLabel: Record<string, string> = {
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

const typeLabel: Record<string, string> = {
  unusual_spike: "Pic inhabituel",
  indicator_inconsistency: "Incohérence d'indicateur",
};

export default function AnomaliesPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = session?.user?.companyId;
  const token = session?.accessToken;

  useEffect(() => {
    if (status === "loading") return;

    if (!token || !companyId) {
      setError("Session invalide ou entreprise non définie.");
      setLoading(false);
      return;
    }

    async function fetchAnomalies() {
      try {
        setLoading(true);

        const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/anomalies?company_id=${companyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }

        const json: AnomalyResponse = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchAnomalies();
  }, [companyId, token, status]);

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-orange-600 mb-2">
        EXPÉRIMENTAL — DÉTECTION AUTOMATIQUE
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Anomalies détectées
      </h1>
      <p className="text-gray-500 mb-8">
        Écarts inhabituels identifiés automatiquement dans vos données ESG.
      </p>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          Chargement...
        </div>
      )}

      {error && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-red-600">
          Erreur lors du chargement : {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.total}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
              <p className="text-sm text-red-600 mb-1">Élevée</p>
              <p className="text-2xl font-bold text-red-700">
                {data.summary.high}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5">
              <p className="text-sm text-orange-600 mb-1">Moyenne</p>
              <p className="text-2xl font-bold text-orange-700">
                {data.summary.medium}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-yellow-200 shadow-sm p-5">
              <p className="text-sm text-yellow-600 mb-1">Faible</p>
              <p className="text-2xl font-bold text-yellow-700">
                {data.summary.low}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {data.alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucune anomalie détectée pour le moment.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Période</th>
                    <th className="px-6 py-4 font-medium">Message</th>
                    <th className="px-6 py-4 font-medium">Valeur</th>
                    <th className="px-6 py-4 font-medium">Score</th>
                    <th className="px-6 py-4 font-medium">Sévérité</th>
                  </tr>
                </thead>
                <tbody>
                  {data.alerts.map((a, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {typeLabel[a.type] ?? a.type}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{a.period}</td>
                      <td className="px-6 py-4 text-gray-700 max-w-sm">
                        {a.message}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {a.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {a.score.toFixed(3)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${severityStyles[a.severity]}`}
                        >
                          {severityLabel[a.severity]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}