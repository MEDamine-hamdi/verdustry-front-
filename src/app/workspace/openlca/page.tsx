"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  runLcaCalculation,
  saveLcaCalculation,
  fetchLcaCalculations,
  fetchSites,
  fetchSuppliers,
  fetchTargets,
  ApiError,
  type LcaCalculationResponse,
  type ApiSite,
  type ApiSupplier,
  type ApiTarget,
} from "@/lib/api";

type TransportMode = "road" | "rail" | "sea" | "air";

const TRANSPORT_MODE_FACTORS: Record<TransportMode, number> = {
  road: 0.15,
  rail: 0.03,
  sea: 0.01,
  air: 0.5,
};

const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  road: "Route (camion)",
  rail: "Rail (train)",
  sea: "Maritime (bateau)",
  air: "Aérien (avion)",
};

export default function BilanCarbonePage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [sites, setSites] = useState<ApiSite[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [targets, setTargets] = useState<ApiTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [history, setHistory] = useState<LcaCalculationResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [electricityKwh, setElectricityKwh] = useState(1000);
  const [period, setPeriod] = useState("2025-01");
  const [electricityFactor, setElectricityFactor] = useState(0.5); // kgCO2e/kWh
  const [transportMode, setTransportMode] = useState<TransportMode>("road");
  const [transportFactor, setTransportFactor] = useState(TRANSPORT_MODE_FACTORS.road);

  const [result, setResult] = useState<LcaCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token || !companyId) return;
    setLoadingData(true);
    setError("");
    try {
      const [sitesData, suppliersData, historyData, targetsData] = await Promise.all([
        fetchSites(token, companyId),
        fetchSuppliers(token, companyId),
        fetchLcaCalculations(token, companyId),
        fetchTargets(token, companyId),
      ]);
      setSites(sitesData);
      setSuppliers(suppliersData);
      setHistory(historyData);
      setTargets(targetsData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoadingData(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const relevantSuppliers = useMemo(() => {
    if (selectedSiteId === "all") return suppliers;
    return suppliers.filter((s) => s.siteId === selectedSiteId);
  }, [suppliers, selectedSiteId]);

  const totalDistanceKm = useMemo(
    () => relevantSuppliers.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0),
    [relevantSuppliers],
  );

  const transportKgCo2e = totalDistanceKm * transportFactor;
  const electricityKgCo2e = electricityKwh * electricityFactor;

  const selectedSiteName =
    selectedSiteId === "all" ? "tous les sites" : sites.find((s) => s.id === selectedSiteId)?.name ?? "—";

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);

  const resultTco2e = result?.totalCarbonFootprint != null ? result.totalCarbonFootprint / 1000 : null;

  const targetComparison =
    selectedTarget?.targetValue != null && resultTco2e != null
      ? {
          targetValue: selectedTarget.targetValue,
          diff: resultTco2e - selectedTarget.targetValue,
          diffPercent: ((resultTco2e - selectedTarget.targetValue) / selectedTarget.targetValue) * 100,
          isOverTarget: resultTco2e > selectedTarget.targetValue,
        }
      : null;

  function siteNameFor(siteId?: string) {
    if (!siteId) return "Tous les sites";
    return sites.find((s) => s.id === siteId)?.name ?? "—";
  }

  function handleModeChange(mode: TransportMode) {
    setTransportMode(mode);
    setTransportFactor(TRANSPORT_MODE_FACTORS[mode]);
  }

  const handleCalculate = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      const response = await runLcaCalculation({
        companyId,
        siteId: selectedSiteId !== "all" ? selectedSiteId : undefined,
        period,
        processRef: "Electricity consumption",
        inputData: { electricity_kwh: electricityKwh },
        electricityFactor,
        transportKgCo2e,
      });
      setResult(response);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du calcul");
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedSiteId, period, electricityKwh, electricityFactor, transportKgCo2e]);

  const handleSave = useCallback(async () => {
    if (!token || !companyId || !result) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveLcaCalculation(token, {
        companyId,
        siteId: selectedSiteId !== "all" ? selectedSiteId : undefined,
        period,
        processRef: result.processRef,
        inputData: result.inputData ?? {},
        impactMethod: result.impactMethod,
        totalCarbonFootprint: result.totalCarbonFootprint ?? 0,
        unit: result.unit ?? "kgCO2e",
        resultBreakdown: (result.resultBreakdown as { category: string; amount: number; unit: string }[]) ?? [],
      });
      setHistory((h) => [saved, ...h]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [token, companyId, result, selectedSiteId, period]);

  function exportHistoryCsv() {
    const headers = ["Date", "Site", "Période", "Total", "Unité"];
    const rows = history.map((h) => [
      h.calculatedAt ? new Date(h.calculatedAt).toLocaleString("fr-FR") : "",
      siteNameFor(h.siteId),
      h.period ?? "",
      h.totalCarbonFootprint?.toString() ?? "",
      h.unit ?? "",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bilan-carbone-historique-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportResultPdf() {
    window.print();
  }

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
        <h1 className="text-[25px]">Bilan carbone</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Calcule le bilan carbone d&apos;un site (ou de l&apos;ensemble de vos sites) à partir de
          la consommation électrique et du transport lié à vos fournisseurs. Moteur de calcul :
          openLCA — données de test simulées, connexion réelle en attente de validation.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 print:block">
        <div className="card print:hidden">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Données d&apos;activité
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Site
            </label>
            <select
              className="input-field"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              disabled={loadingData}
            >
              <option value="all">Tous les sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Comparer à un objectif (optionnel)
            </label>
            <select
              className="input-field"
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              disabled={loadingData}
            >
              <option value="">— Aucun —</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.targetValue ?? "—"} {t.metric}
                  {t.targetYear ? `, ${t.targetYear}` : ""})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Électricité consommée (kWh)
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={electricityKwh}
              onChange={(e) => setElectricityKwh(Number(e.target.value))}
            />
          </div>

          <div className="mb-2.5 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
                Facteur électricité (kgCO2e/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                value={electricityFactor}
                onChange={(e) => setElectricityFactor(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
                Mode de transport
              </label>
              <select
                className="input-field"
                value={transportMode}
                onChange={(e) => handleModeChange(e.target.value as TransportMode)}
              >
                {(Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {TRANSPORT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-2.5">
            <label className="mb-1 block text-[11.5px] font-semibold text-[var(--text-soft)]">
              Facteur transport (kgCO2e/km) — ajustable
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={transportFactor}
              onChange={(e) => setTransportFactor(Number(e.target.value))}
            />
          </div>
          <p className="-mt-1.5 mb-2.5 text-[11.5px] text-[var(--text-faint)]">
            Le facteur se met à jour selon le mode choisi ({TRANSPORT_MODE_LABELS[transportMode]}) —
            vous pouvez l&apos;ajuster manuellement si besoin.
          </p>

          <div className="mt-3 rounded-[9px] border border-[var(--line)] p-3 text-[12.5px] text-[var(--text-soft)]">
            <div className="mb-1 font-semibold text-[var(--ink)]">
              Fournisseurs pris en compte ({selectedSiteName})
            </div>
            {loadingData ? (
              <div className="text-[var(--text-faint)]">Chargement…</div>
            ) : relevantSuppliers.length === 0 ? (
              <div className="text-[var(--text-faint)]">
                Aucun fournisseur associé à ce site pour le moment.
              </div>
            ) : (
              <ul className="space-y-1">
                {relevantSuppliers.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="text-[var(--text-faint)]">
                      {s.distanceKm != null ? `${s.distanceKm} km` : "distance non renseignée"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 border-t border-[var(--line)] pt-2 text-[11.5px] text-[var(--text-faint)]">
              Distance totale : {totalDistanceKm.toLocaleString("fr-FR")} km · Facteur transport :{" "}
              {transportFactor} kgCO2e/km
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={loading || loadingData}
            className="btn btn-primary mt-3 w-full justify-center"
          >
            {loading ? "Calcul en cours…" : "Calculer le bilan carbone"}
          </button>
        </div>

        <div className="card">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--ink)]">Résultat du calcul</div>
            {result && (
              <div className="flex gap-2 print:hidden">
                <button onClick={exportResultPdf} className="btn btn-sm">
                  Exporter en PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="btn btn-sm"
                >
                  {saved ? "✓ Enregistré" : saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
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
                  {result.totalCarbonFootprint?.toLocaleString("fr-FR")}{" "}
                  <span className="text-[14px] font-normal text-[var(--text-faint)]">
                    {result.unit}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-[var(--text-faint)]">
                  Bilan carbone estimé — {selectedSiteName}
                </div>
              </div>

              {targetComparison && selectedTarget && (
                <div
                  className={`mt-3.5 rounded-[9px] border p-3.5 text-[12.5px] ${
                    targetComparison.isOverTarget
                      ? "border-[#eecdc2] bg-[#f8e6e1] text-[#8a3320]"
                      : "border-[#c9e3d1] bg-[#e8f4ec] text-[var(--moss-dark)]"
                  }`}
                >
                  <div className="font-semibold">
                    {targetComparison.isOverTarget ? "⚠️ Au-dessus de l'objectif" : "✅ Sous l'objectif"}
                    {" — "}
                    {selectedTarget.name}
                  </div>
                  <div className="mt-1">
                    Résultat : {resultTco2e?.toFixed(3)} tCO2e · Objectif :{" "}
                    {targetComparison.targetValue.toLocaleString("fr-FR")} tCO2e ·{" "}
                    {targetComparison.isOverTarget ? "+" : ""}
                    {targetComparison.diffPercent.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">
                    Comparaison basée sur le résultat converti en tCO2e (1000 kgCO2e = 1 tCO2e).
                    Assurez-vous que l&apos;unité de votre objectif ({selectedTarget.metric})
                    correspond bien à des tCO2e.
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-[var(--line)] pt-3.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                Détail par catégorie d&apos;impact
              </div>
              <table className="mt-2 w-full border-collapse text-[13px]">
                <tbody>
                  {(result.resultBreakdown as { category: string; amount: number; unit: string }[])?.map(
                    (item) => (
                      <tr key={item.category}>
                        <td className="border-b border-[var(--line)] px-3 py-2.5">{item.category}</td>
                        <td className="border-b border-[var(--line)] px-3 py-2.5 text-right">
                          {item.amount.toLocaleString("fr-FR")} {item.unit}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>

              <div className="mt-4 rounded-[9px] bg-[var(--paper)] p-3.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">
                Ce résultat représente l&apos;empreinte carbone estimée pour{" "}
                <strong>{selectedSiteName}</strong> sur la période <strong>{period}</strong> : la
                consommation de <strong>{electricityKwh.toLocaleString("fr-FR")} kWh</strong>{" "}
                d&apos;électricité génère environ{" "}
                {(result.resultBreakdown as { amount: number }[] | undefined)?.[0]?.amount.toLocaleString(
                  "fr-FR",
                )}{" "}
                kgCO2e, à laquelle s&apos;ajoutent{" "}
                {transportKgCo2e > 0
                  ? `environ ${transportKgCo2e.toLocaleString("fr-FR")} kgCO2e liés au transport de ${relevantSuppliers.length} fournisseur(s) sur un total de ${totalDistanceKm.toLocaleString("fr-FR")} km`
                  : "aucune émission de transport (aucune distance renseignée pour les fournisseurs concernés)"}
                . Le transport est estimé pour un mode {TRANSPORT_MODE_LABELS[transportMode].toLowerCase()}.
                Ces valeurs sont calculées à partir des facteurs saisis ci-contre
                ({electricityFactor} kgCO2e/kWh, {transportFactor} kgCO2e/km) — ajustez-les selon
                vos données réelles pour affiner la précision du résultat.
              </div>
            </>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="card mt-5 print:hidden">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--ink)]">
              Historique des calculs enregistrés
            </div>
            <button onClick={exportHistoryCsv} className="btn btn-sm">
              Exporter en CSV
            </button>
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Date
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Site
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Période
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {h.calculatedAt ? new Date(h.calculatedAt).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{siteNameFor(h.siteId)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{h.period ?? "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {h.totalCarbonFootprint?.toLocaleString("fr-FR")} {h.unit}
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