"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  predictOvershootRisk,
  predictCbamCost,
  ApiError,
  type OvershootPredictionResponse,
  type CostPredictionResponse,
} from "@/lib/api";

const SECTORS = ["Agroalimentaire", "Aluminium", "Ciment", "Engrais_Phosphates", "Sidérurgie", "Textile"];

export default function PredictionsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [error, setError] = useState("");

  // --- Overshoot form ---
  const [overshootForm, setOvershootForm] = useState({
    sector: "Aluminium",
    emissionsTco2e: "32616.57",
    productionVolume: "90145.84",
    emissionsMa3: "30136.87",
    emissionsTrend3m: "0.2561",
    targetTrend3m: "-0.0123",
    gapToTargetPct: "7.383",
    cbamExposureRatio: "0.0064",
    euExportShare: "0.4121",
  });
  const [overshootResult, setOvershootResult] = useState<OvershootPredictionResponse | null>(null);
  const [overshootLoading, setOvershootLoading] = useState(false);

  // --- Cost form ---
  const [costForm, setCostForm] = useState({
    sector: "Aluminium",
    emissionsTco2e: "32616.57",
    productionVolume: "90145.84",
    cbamExposureRatio: "0.0064",
    euExportShare: "0.4121",
    cbamPriceEurTco2e: "64.84",
    freeAllocationPct: "0.975",
  });
  const [costResult, setCostResult] = useState<CostPredictionResponse | null>(null);
  const [costLoading, setCostLoading] = useState(false);

  async function handleOvershootPredict() {
    if (!token) return;
    setOvershootLoading(true);
    setError("");
    try {
      const result = await predictOvershootRisk(token, {
        sector: overshootForm.sector,
        emissionsTco2e: Number(overshootForm.emissionsTco2e),
        productionVolume: Number(overshootForm.productionVolume),
        emissionsMa3: Number(overshootForm.emissionsMa3),
        emissionsTrend3m: Number(overshootForm.emissionsTrend3m),
        targetTrend3m: Number(overshootForm.targetTrend3m),
        gapToTargetPct: Number(overshootForm.gapToTargetPct),
        cbamExposureRatio: Number(overshootForm.cbamExposureRatio),
        euExportShare: Number(overshootForm.euExportShare),
      });
      setOvershootResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de prédiction");
    } finally {
      setOvershootLoading(false);
    }
  }

  async function handleCostPredict() {
    if (!token) return;
    setCostLoading(true);
    setError("");
    try {
      const result = await predictCbamCost(token, {
        sector: costForm.sector,
        emissionsTco2e: Number(costForm.emissionsTco2e),
        productionVolume: Number(costForm.productionVolume),
        cbamExposureRatio: Number(costForm.cbamExposureRatio),
        euExportShare: Number(costForm.euExportShare),
        cbamPriceEurTco2e: Number(costForm.cbamPriceEurTco2e),
        freeAllocationPct: Number(costForm.freeAllocationPct),
      });
      setCostResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de prédiction");
    } finally {
      setCostLoading(false);
    }
  }

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
            Risque de dépassement (3 mois)
          </div>

          <FieldSelect
            label="Secteur"
            value={overshootForm.sector}
            options={SECTORS}
            onChange={(v) => setOvershootForm({ ...overshootForm, sector: v })}
          />
          <FieldNum label="Émissions actuelles (tCO2e)" value={overshootForm.emissionsTco2e} onChange={(v) => setOvershootForm({ ...overshootForm, emissionsTco2e: v })} />
          <FieldNum label="Volume de production" value={overshootForm.productionVolume} onChange={(v) => setOvershootForm({ ...overshootForm, productionVolume: v })} />
          <FieldNum label="Moyenne mobile 3 mois" value={overshootForm.emissionsMa3} onChange={(v) => setOvershootForm({ ...overshootForm, emissionsMa3: v })} />
          <FieldNum label="Tendance émissions 3 mois" value={overshootForm.emissionsTrend3m} onChange={(v) => setOvershootForm({ ...overshootForm, emissionsTrend3m: v })} />
          <FieldNum label="Tendance cible 3 mois" value={overshootForm.targetTrend3m} onChange={(v) => setOvershootForm({ ...overshootForm, targetTrend3m: v })} />
          <FieldNum label="Écart à la cible (%)" value={overshootForm.gapToTargetPct} onChange={(v) => setOvershootForm({ ...overshootForm, gapToTargetPct: v })} />
          <FieldNum label="Ratio exposition CBAM" value={overshootForm.cbamExposureRatio} onChange={(v) => setOvershootForm({ ...overshootForm, cbamExposureRatio: v })} />
          <FieldNum label="Part export UE" value={overshootForm.euExportShare} onChange={(v) => setOvershootForm({ ...overshootForm, euExportShare: v })} />

          <button className="btn btn-primary mt-2" onClick={handleOvershootPredict} disabled={overshootLoading}>
            {overshootLoading ? "Prédiction…" : "Prédire le risque"}
          </button>

          {overshootResult && (
            <div className="mt-4 rounded-[9px] border border-[var(--line)] p-4 text-center">
              <div className={`text-[22px] font-semibold ${overshootResult.overshootRisk ? "text-[#8a3320]" : "text-[var(--moss-dark)]"}`}>
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

          <FieldSelect
            label="Secteur"
            value={costForm.sector}
            options={SECTORS}
            onChange={(v) => setCostForm({ ...costForm, sector: v })}
          />
          <FieldNum label="Émissions actuelles (tCO2e)" value={costForm.emissionsTco2e} onChange={(v) => setCostForm({ ...costForm, emissionsTco2e: v })} />
          <FieldNum label="Volume de production" value={costForm.productionVolume} onChange={(v) => setCostForm({ ...costForm, productionVolume: v })} />
          <FieldNum label="Ratio exposition CBAM" value={costForm.cbamExposureRatio} onChange={(v) => setCostForm({ ...costForm, cbamExposureRatio: v })} />
          <FieldNum label="Part export UE" value={costForm.euExportShare} onChange={(v) => setCostForm({ ...costForm, euExportShare: v })} />
          <FieldNum label="Prix CBAM (EUR/tCO2e)" value={costForm.cbamPriceEurTco2e} onChange={(v) => setCostForm({ ...costForm, cbamPriceEurTco2e: v })} />
          <FieldNum label="Allocation gratuite (%)" value={costForm.freeAllocationPct} onChange={(v) => setCostForm({ ...costForm, freeAllocationPct: v })} />

          <button className="btn btn-primary mt-2" onClick={handleCostPredict} disabled={costLoading}>
            {costLoading ? "Prédiction…" : "Prédire le coût"}
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

function FieldNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">{label}</label>
      <input className="input-field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">{label}</label>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}