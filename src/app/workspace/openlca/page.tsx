"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  runLcaCalculation,
  ApiError,
  type LcaCalculationResponse,
} from "@/lib/api";

export default function OpenLcaPage() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;

  const [result, setResult] = useState<LcaCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    processRef: "Electricity consumption",
    period: "2025-01",
    electricityKwh: 1000,
  });

  const handleCalculate = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await runLcaCalculation({
        companyId,
        period: form.period,
        processRef: form.processRef,
        inputData: { electricity_kwh: form.electricityKwh },
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du calcul");
    } finally {
      setLoading(false);
    }
  }, [companyId, form]);

  if (!companyId) {
    return (
      <div className="card">
        <p className="text-sm text-[var(--text-soft)]">
          Aucune entreprise n&apos;est associée à votre compte.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--amber)]">
          Expérimental — local uniquement
        </div>
        <h1 className="text-[25px]">OpenLCA — Bilan carbone</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Envoie des données d&apos;activité à openLCA pour calculer le bilan carbone via un
          moteur de cycle de vie. Données de test simulées — connexion réelle en attente de
          validation par l&apos;équipe.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Données d&apos;activité
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Process openLCA
            </label>
            <input
              className="input-field"
              value={form.processRef}
              onChange={(e) => setForm({ ...form, processRef: e.target.value })}
            />
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Période
            </label>
            <input
              className="input-field"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Électricité consommée (kWh)
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={form.electricityKwh}
              onChange={(e) =>
                setForm({ ...form, electricityKwh: Number(e.target.value) })
              }
            />
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="btn btn-primary mt-2 w-full justify-center"
          >
            {loading ? "Calcul en cours…" : "Calculer via OpenLCA"}
          </button>
        </div>

        <div className="card">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Résultat du calcul
          </div>

          {!result && !loading && (
            <div className="py-10 text-center text-[13px] text-[var(--text-faint)]">
              Aucun calcul lancé pour le moment.
            </div>
          )}

          {loading && (
            <div className="py-10 text-center text-[13px] text-[var(--text-faint)]">
              Envoi vers openLCA…
            </div>
          )}

          {result && (
            <>
              <div className="rounded-[9px] border border-[var(--line)] p-4 text-center">
                <div className="text-[26px] font-semibold text-[var(--ink)]">
                  {result.totalCarbonFootprint.toLocaleString("fr-FR")}{" "}
                  <span className="text-[14px] font-normal text-[var(--text-faint)]">
                    {result.unit}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-[var(--text-faint)]">
                  Bilan carbone estimé ({result.impactMethod})
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--line)] pt-3.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Détail par catégorie d&apos;impact
              </div>
              <table className="mt-2 w-full border-collapse text-[13px]">
                <tbody>
                  {result.resultBreakdown.map((item) => (
                    <tr key={item.category}>
                      <td className="border-b border-[var(--line)] px-3 py-2.5">
                        {item.category}
                      </td>
                      <td className="border-b border-[var(--line)] px-3 py-2.5 text-right">
                        {item.amount.toLocaleString("fr-FR")} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}