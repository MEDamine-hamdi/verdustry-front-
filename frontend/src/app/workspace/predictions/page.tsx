"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  predictOvershootRisk,
  predictCbamCost,
  ApiError,
  type OvershootPredictionResponse,
  type CostPredictionResponse,
} from "@/lib/api";

export default function PredictionsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [overshootResult, setOvershootResult] = useState<OvershootPredictionResponse | null>(null);
  const [costResult, setCostResult] = useState<CostPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overshootForm, setOvershootForm] = useState({
    sector: "Manufacturing",
    emissionsTco2e: 10000,
    productionVolume: 5000,
    emissionsMa3: 9500,
    emissionsTrend3m: 50,
    targetTrend3m: 100,
    gapToTargetPct: 15,
    cbamExposureRatio: 0.3,
    euExportShare: 0.4,
  });

  const [cbamForm, setCbamForm] = useState({
    sector: "Manufacturing",
    emissionsTco2e: 10000,
    productionVolume: 5000,
    cbamExposureRatio: 0.3,
    euExportShare: 0.4,
    cbamPriceEurTco2e: 65,
    freeAllocationPct: 0.95,
  });

  const handlePredictOvershoot = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await predictOvershootRisk(token, overshootForm);
      setOvershootResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la prédiction");
    } finally {
      setLoading(false);
    }
  }, [token, overshootForm]);

  const handlePredictCbam = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await predictCbamCost(token, cbamForm);
      setCostResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la prédiction");
    } finally {
      setLoading(false);
    }
  }, [token, cbamForm]);

  const handleOvershootChange = (field: string, value: string) => {
    setOvershootForm((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleCbamChange = (field: string, value: string) => {
    setCbamForm((prev) => ({ ...prev, [field]: Number(value) }));
  };

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--amber)]">
          Expérimental — local uniquement
        </div>
        <h1 className="text-[25px]">Prédictions (Machine Learning)</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Page de test des modèles ML entraînés en local. Non connectée aux vraies données —
          saisie manuelle pour valider les modèles avant intégration officielle (Sprint 5).
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* --- Overshoot Risk --- */}
        <div className="card">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Risque de dépassement de cible (3 mois)
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">Secteur</label>
            <input
              className="input-field"
              value={overshootForm.sector}
              onChange={(e) => setOvershootForm({ ...overshootForm, sector: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "emissionsTco2e", label: "Émissions (tCO2e)" },
                { key: "productionVolume", label: "Volume de production" },
                { key: "emissionsMa3", label: "Émissions MA3" },
                { key: "emissionsTrend3m", label: "Tendance émissions (3m)" },
                { key: "targetTrend3m", label: "Tendance cible (3m)" },
                { key: "gapToTargetPct", label: "Écart à la cible (%)" },
                { key: "cbamExposureRatio", label: "Ratio exposition CBAM" },
                { key: "euExportShare", label: "Part export UE" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="mb-2.5">
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
                  {label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={overshootForm[key]}
                  onChange={(e) => handleOvershootChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePredictOvershoot}
            disabled={loading}
            className="btn btn-primary mt-2 w-full justify-center"
          >
            {loading ? "Calcul en cours…" : "Prédire le risque"}
          </button>

          {overshootResult && (
            <div className="mt-4 rounded-[9px] border border-[var(--line)] p-4 text-center">
              <div
                className={`text-[22px] font-semibold ${
                  overshootResult.overshootRisk ? "text-[#8a3320]" : "text-[var(--moss-dark)]"
                }`}
              >
                {overshootResult.overshootRisk ? "⚠️ Risque de dépassement" : "✅ Pas de risque détecté"}
              </div>
              <div className="mt-1 text-[13px] text-[var(--text-faint)]">
                Probabilité : {(overshootResult.probability * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* --- CBAM Cost --- */}
        <div className="card">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Prédiction du coût carbone CBAM
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">Secteur</label>
            <input
              className="input-field"
              value={cbamForm.sector}
              onChange={(e) => setCbamForm({ ...cbamForm, sector: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "emissionsTco2e", label: "Émissions (tCO2e)" },
                { key: "productionVolume", label: "Volume de production" },
                { key: "cbamExposureRatio", label: "Ratio exposition CBAM" },
                { key: "euExportShare", label: "Part export UE" },
                { key: "cbamPriceEurTco2e", label: "Prix CBAM (€/tCO2e)" },
                { key: "freeAllocationPct", label: "% allocation gratuite" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="mb-2.5">
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
                  {label}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={cbamForm[key]}
                  onChange={(e) => handleCbamChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePredictCbam}
            disabled={loading}
            className="btn btn-primary mt-2 w-full justify-center"
          >
            {loading ? "Calcul en cours…" : "Prédire le coût"}
          </button>

          {costResult && (
            <div className="mt-4 rounded-[9px] border border-[var(--line)] p-4 text-center">
              <div className="text-[26px] font-semibold text-[var(--ink)]">
                {costResult.predictedCostTnd.toLocaleString("fr-FR")} TND
              </div>
              <div className="mt-1 text-[13px] text-[var(--text-faint)]">Coût CBAM estimé</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}