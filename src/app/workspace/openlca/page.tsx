"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  calculateLcaReal,
  saveLcaCalculation,
  fetchLcaCalculations,
  fetchSites,
  fetchSuppliers,
  fetchTargets,
  fetchAggregate,
  ApiError,
  type LcaCalculationResponse,
  type ApiSite,
  type ApiSupplier,
  type ApiTarget,
} from "@/lib/api";
import { readBilanCarboneImport, clearBilanCarboneImport } from "@/lib/bilanCarboneImport";

type Scope = 1 | 2 | 3;
type Group = "amont" | "aval" | null;

type LineItem = {
  key: string;
  scope: Scope;
  group: Group;
  label: string;
  unit: string;
  defaultFactor: number;
  isElectricity?: boolean;
};

const LINE_ITEMS: LineItem[] = [
  { key: "combustion_fixed_mobile", scope: 1, group: null, label: "Sources fixes et mobiles de combustion", unit: "L carburant", defaultFactor: 2.68 },
  { key: "fugitive_emissions", scope: 1, group: null, label: "Émissions fugitives", unit: "kg gaz réfrigérant", defaultFactor: 150 },
  { key: "non_energy_process", scope: 1, group: null, label: "Procédés hors énergie", unit: "kg produit transformé", defaultFactor: 0.3 },
  { key: "biomass", scope: 1, group: null, label: "Biomasses", unit: "kg biomasse brûlée", defaultFactor: 0.1 },

  { key: "electricity", scope: 2, group: null, label: "Consommation d'électricité", unit: "kWh", defaultFactor: 0.5, isElectricity: true },
  { key: "steam_heat_cold", scope: 2, group: null, label: "Consommation de vapeur, chaleur ou froid", unit: "kWh thermique", defaultFactor: 0.2 },

  { key: "purchased_goods", scope: 3, group: "amont", label: "Achats de produits et services", unit: "k€ dépensés", defaultFactor: 0.4 },
  { key: "capital_goods", scope: 3, group: "amont", label: "Amortissements (immobilisations)", unit: "k€ valeur", defaultFactor: 0.3 },
  { key: "fuel_energy_upstream", scope: 3, group: "amont", label: "Amont de l'énergie", unit: "kWh", defaultFactor: 0.05 },
  { key: "upstream_freight", scope: 3, group: "amont", label: "Transport de marchandises amont", unit: "km", defaultFactor: 0.15 },
  { key: "visitor_transport", scope: 3, group: "amont", label: "Transport de visiteurs et de clients", unit: "km", defaultFactor: 0.15 },
  { key: "commuting", scope: 3, group: "amont", label: "Déplacements domicile-travail", unit: "km", defaultFactor: 0.12 },
  { key: "business_travel", scope: 3, group: "amont", label: "Déplacements professionnels", unit: "km", defaultFactor: 0.18 },
  { key: "leased_assets_upstream", scope: 3, group: "amont", label: "Actifs en leasing amont", unit: "k€ valeur", defaultFactor: 0.3 },

  { key: "downstream_freight", scope: 3, group: "aval", label: "Transport de marchandises aval", unit: "km", defaultFactor: 0.15 },
  { key: "product_use", scope: 3, group: "aval", label: "Utilisation des produits vendus", unit: "kWh", defaultFactor: 0.4 },
  { key: "downstream_leasing", scope: 3, group: "aval", label: "Leasing aval", unit: "k€ valeur", defaultFactor: 0.3 },
  { key: "waste", scope: 3, group: "aval", label: "Déchets", unit: "kg", defaultFactor: 0.5 },
  { key: "end_of_life", scope: 3, group: "aval", label: "Fin de vie des produits vendus", unit: "kg produit", defaultFactor: 0.3 },
  { key: "franchises", scope: 3, group: "aval", label: "Franchise aval", unit: "k€ CA franchisé", defaultFactor: 0.2 },
  { key: "other_indirect", scope: 3, group: "aval", label: "Autres émissions indirectes", unit: "k€", defaultFactor: 0.2 },
];

type ItemState = { quantity: number; factor: number };

export default function BilanCarbonePage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [sites, setSites] = useState<ApiSite[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [targets, setTargets] = useState<ApiTarget[]>([]);
  const [history, setHistory] = useState<LcaCalculationResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [period, setPeriod] = useState("2025-01");

  const [items, setItems] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(
      LINE_ITEMS.map((i) => [i.key, { quantity: i.isElectricity ? 1000 : 0, factor: i.defaultFactor }]),
    ),
  );
  const [fileImportBanner, setFileImportBanner] = useState<string | null>(null);

  const [scope2Result, setScope2Result] = useState<LcaCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [importedScopeTotalsKg, setImportedScopeTotalsKg] = useState<Record<number, number>>({});
  const [loadingImported, setLoadingImported] = useState(false);
  const [importedUnavailable, setImportedUnavailable] = useState(false);

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

  useEffect(() => {
    const imported = readBilanCarboneImport();
    if (!imported) return;

    setItems((prev) => {
      const next = { ...prev };
      for (const { category, quantity } of imported.items) {
        if (next[category]) {
          next[category] = { ...next[category], quantity };
        }
      }
      return next;
    });

    if (imported.period) setPeriod(imported.period);

    setFileImportBanner(
      `${imported.items.length} poste(s) importé(s) depuis le fichier` +
        (imported.siteName ? ` (site : ${imported.siteName})` : "") +
        `. Sélectionnez le site correspondant ci-dessous si besoin.`,
    );

    clearBilanCarboneImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadImportedTotals = useCallback(async () => {
    if (!token || !companyId) return;
    setLoadingImported(true);
    setImportedUnavailable(false);
    try {
      const siteId = selectedSiteId !== "all" ? selectedSiteId : undefined;
      const result = await fetchAggregate(token, companyId, "scope", {
        siteId,
        periodFrom: period || undefined,
        periodTo: period || undefined,
      });
      const totals: Record<number, number> = {};
      for (const item of result.items) {
        const match = item.key.match(/\d+/);
        if (!match) continue;
        const scopeNum = Number(match[0]);
        const valueKg = item.unit?.toLowerCase().includes("tco2e") ? item.totalValue * 1000 : item.totalValue;
        totals[scopeNum] = (totals[scopeNum] ?? 0) + valueKg;
      }
      setImportedScopeTotalsKg(totals);
    } catch {
      setImportedScopeTotalsKg({});
      setImportedUnavailable(true);
    } finally {
      setLoadingImported(false);
    }
  }, [token, companyId, selectedSiteId, period]);

  useEffect(() => {
    loadImportedTotals();
  }, [loadImportedTotals]);

  const relevantSuppliers = useMemo(() => {
    if (selectedSiteId === "all") return suppliers;
    return suppliers.filter((s) => s.siteId === selectedSiteId);
  }, [suppliers, selectedSiteId]);

  const totalDistanceKm = useMemo(
    () => relevantSuppliers.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0),
    [relevantSuppliers],
  );

  // Auto-remplit "Transport de marchandises amont" avec la distance fournisseurs calculée
  // automatiquement (géocodage), sans action manuelle.
  useEffect(() => {
    if (totalDistanceKm > 0) {
      setItems((prev) => ({
        ...prev,
        upstream_freight: { ...prev.upstream_freight, quantity: totalDistanceKm },
      }));
    }
  }, [totalDistanceKm]);

  function updateItem(key: string, field: "quantity" | "factor", value: number) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function itemSubtotal(item: LineItem): number {
    const state = items[item.key];
    if (item.isElectricity && scope2Result) {
      return scope2Result.totalCarbonFootprint ?? 0;
    }
    return state.quantity * state.factor;
  }

  const scope1Items = LINE_ITEMS.filter((i) => i.scope === 1);
  const scope2Items = LINE_ITEMS.filter((i) => i.scope === 2);
  const scope3AmontItems = LINE_ITEMS.filter((i) => i.scope === 3 && i.group === "amont");
  const scope3AvalItems = LINE_ITEMS.filter((i) => i.scope === 3 && i.group === "aval");

  const scope1Manual = scope1Items.reduce((sum, i) => sum + itemSubtotal(i), 0);
  const scope2Manual = scope2Items.reduce((sum, i) => sum + itemSubtotal(i), 0);
  const scope3Manual = [...scope3AmontItems, ...scope3AvalItems].reduce((sum, i) => sum + itemSubtotal(i), 0);

  const scope1Total = (importedScopeTotalsKg[1] ?? 0) + scope1Manual;
  const scope2Total = (importedScopeTotalsKg[2] ?? 0) + scope2Manual;
  const scope3Total = (importedScopeTotalsKg[3] ?? 0) + scope3Manual;
  const grandTotalKg = scope1Total + scope2Total + scope3Total;
  const grandTotalTco2e = grandTotalKg / 1000;

  const selectedSiteName =
    selectedSiteId === "all" ? "tous les sites" : sites.find((s) => s.id === selectedSiteId)?.name ?? "—";

  function siteNameFor(siteId?: string) {
    if (!siteId) return "Tous les sites";
    return sites.find((s) => s.id === siteId)?.name ?? "—";
  }

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);
  const targetComparison =
    selectedTarget?.targetValue != null
      ? {
          diffPercent: ((grandTotalTco2e - selectedTarget.targetValue) / selectedTarget.targetValue) * 100,
          isOverTarget: grandTotalTco2e > selectedTarget.targetValue,
        }
      : null;

  const handleCalculate = useCallback(async () => {
    if (!token || !companyId) return;
    setLoading(true);
    setError("");
    setScope2Result(null);
    try {
      const siteId = selectedSiteId !== "all" ? selectedSiteId : undefined;
      const newHistoryEntries: LcaCalculationResponse[] = [];

      const electricityQty = items.electricity.quantity;
      const scope2Response = await calculateLcaReal(token, {
        companyId,
        siteId,
        period,
        scope: 2,
        electricityKwh: electricityQty,
      });
      setScope2Result(scope2Response);
      newHistoryEntries.push(scope2Response);

      const otherItems = LINE_ITEMS.filter((i) => !i.isElectricity);
      for (const item of otherItems) {
        const state = items[item.key];
        if (state.quantity <= 0) continue;
        const subtotal = state.quantity * state.factor;
        const response = await saveLcaCalculation(token, {
          companyId,
          siteId,
          period,
          scope: item.scope,
          processRef: item.label,
          inputData: { [item.unit]: state.quantity },
          impactMethod: `Estimation (${item.label})`,
          totalCarbonFootprint: Number(subtotal.toFixed(3)),
          unit: "kgCO2e",
          resultBreakdown: [{ category: item.label, amount: Number(subtotal.toFixed(3)), unit: "kg CO2eq" }],
        });
        newHistoryEntries.push(response);
      }

      setHistory((h) => [...newHistoryEntries, ...h]);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `${e.message} (openLCA doit être ouvert avec le serveur IPC actif sur le port 8091)`
          : "Erreur lors du calcul",
      );
    } finally {
      setLoading(false);
    }
  }, [token, companyId, selectedSiteId, period, items]);

  function renderItemRow(item: LineItem) {
    const state = items[item.key];
    const subtotal = itemSubtotal(item);
    return (
      <div key={item.key} className="mb-3 rounded-[9px] border border-[var(--line)] p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--ink)]">{item.label}</span>
          {item.isElectricity && (
            <span className="rounded-full bg-[var(--moss)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--moss-dark)]">
              openLCA
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[10.5px] text-[var(--text-faint)]">{item.unit}</label>
            <input
              type="number"
              step="0.01"
              className="input-field text-[12.5px]"
              value={state.quantity}
              onChange={(e) => updateItem(item.key, "quantity", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10.5px] text-[var(--text-faint)]">
              Facteur (kgCO2e/{item.unit.split(" ")[0]})
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field text-[12.5px]"
              value={state.factor}
              disabled={item.isElectricity}
              onChange={(e) => updateItem(item.key, "factor", Number(e.target.value))}
            />
          </div>
        </div>
        {item.key === "upstream_freight" && totalDistanceKm > 0 && (
          <div className="mt-1.5 text-[11px] text-[var(--moss-dark)]">
            ✅ Auto-rempli depuis les distances fournisseurs géocodées
          </div>
        )}
        <div className="mt-1.5 text-right text-[12px] font-semibold text-[var(--ink)]">
          {subtotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kgCO2e
        </div>
      </div>
    );
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
          Calcule le bilan carbone selon les trois scopes du GHG Protocol. La consommation
          d&apos;électricité (Scope 2) est calculée via un appel réel au moteur openLCA ; le
          transport fournisseurs est calculé automatiquement (distance géocodée) ; les autres
          postes sont estimés à partir de facteurs ajustables.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      {fileImportBanner && (
        <div className="mb-4 rounded-[9px] border border-[#c9e3d1] bg-[#e8f4ec] px-3.5 py-2.5 text-[12.5px] text-[var(--moss-dark)]">
          📄 {fileImportBanner}
        </div>
      )}

      {loadingImported ? (
        <div className="mb-4 rounded-[9px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-faint)]">
          Récupération des données déjà importées…
        </div>
      ) : importedUnavailable ? (
        <div className="mb-4 rounded-[9px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-faint)]">
          Aucune donnée importée trouvée pour ce site/cette période — saisie manuelle utilisée ci-dessous.
        </div>
      ) : (
        <div className="mb-4 rounded-[9px] border border-[#c9e3d1] bg-[#e8f4ec] px-3.5 py-2.5 text-[12.5px] text-[var(--moss-dark)]">
          Champs pré-remplis à partir des données déjà importées (Intégration des données) pour{" "}
          {selectedSiteId === "all" ? "tous les sites" : "ce site"}, période {period || "toutes"} :
          Scope 1 = {(importedScopeTotalsKg[1] ?? 0).toLocaleString("fr-FR")} kg,{" "}
          Scope 2 = {(importedScopeTotalsKg[2] ?? 0).toLocaleString("fr-FR")} kg,{" "}
          Scope 3 = {(importedScopeTotalsKg[3] ?? 0).toLocaleString("fr-FR")} kg.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div className="card">
          <div className="mb-1 text-[11.5px] font-semibold text-[var(--text-soft)]">Site</div>
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

          <div className="mb-1 mt-3 text-[11.5px] font-semibold text-[var(--text-soft)]">Période</div>
          <input className="input-field" value={period} onChange={(e) => setPeriod(e.target.value)} />

          <div className="mb-1 mt-3 text-[11.5px] font-semibold text-[var(--text-soft)]">
            Comparer à un objectif (optionnel)
          </div>
          <select
            className="input-field"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            disabled={loadingData}
          >
            <option value="">— Aucun —</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.targetValue ?? "—"} {t.metric})
              </option>
            ))}
          </select>
        </div>

        <div className="card flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">
            Bilan carbone (données importées + ajustements) — {selectedSiteName}
          </div>
          <div className="mt-1.5 text-[26px] font-semibold text-[var(--ink)]">
            {grandTotalKg.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}{" "}
            <span className="text-[14px] font-normal text-[var(--text-faint)]">kgCO2e</span>
          </div>
          <div className="mt-1 flex gap-3 text-[11px] text-[var(--text-faint)]">
            <span>S1: {scope1Total.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg</span>
            <span>S2: {scope2Total.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg</span>
            <span>S3: {scope3Total.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg</span>
          </div>
          {targetComparison && selectedTarget && (
            <div
              className={`mt-2 rounded-[9px] border p-2.5 text-[11.5px] ${
                targetComparison.isOverTarget
                  ? "border-[#eecdc2] bg-[#f8e6e1] text-[#8a3320]"
                  : "border-[#c9e3d1] bg-[#e8f4ec] text-[var(--moss-dark)]"
              }`}
            >
              {targetComparison.isOverTarget ? "⚠️" : "✅"} vs {selectedTarget.name} :{" "}
              {targetComparison.isOverTarget ? "+" : ""}
              {targetComparison.diffPercent.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="card">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-faint)]">
            Scope 1 — Émissions directes
          </div>
          <div className="mb-3 text-[11.5px] text-[var(--text-faint)]">
            Sources fixes/mobiles, procédés hors énergie, émissions fugitives, biomasses — total
            auto-rempli : {(importedScopeTotalsKg[1] ?? 0).toLocaleString("fr-FR")} kgCO2e. Champs
            ci-dessous = ajustements manuels supplémentaires (facultatif).
          </div>
          {scope1Items.map(renderItemRow)}
        </div>

        <div className="card">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
            Scope 2 — Émissions indirectes (énergie)
          </div>
          <div className="mb-3 text-[11.5px] text-[var(--text-faint)]">
            Électricité (calcul réel openLCA), vapeur/chaleur/froid
          </div>
          {scope2Items.map(renderItemRow)}
        </div>
      </div>

      <div className="card mb-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Scope 3 — Émissions indirectes (chaîne de valeur)
        </div>
        <div className="mb-3 text-[11.5px] text-[var(--text-faint)]">
          Activités en amont et en aval de la production — {relevantSuppliers.length} fournisseur(s)
          suivi(s) pour {selectedSiteName}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-2 text-[11.5px] font-semibold text-[var(--ink)]">
              Amont (approvisionnement)
            </div>
            {scope3AmontItems.map(renderItemRow)}
          </div>
          <div>
            <div className="mb-2 text-[11.5px] font-semibold text-[var(--ink)]">
              Aval (fret et traitement des déchets)
            </div>
            {scope3AvalItems.map(renderItemRow)}
          </div>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={loading || loadingData}
        className="btn btn-primary w-full justify-center"
      >
        {loading ? "Calcul en cours…" : "Calculer le bilan carbone complet"}
      </button>

      {history.length > 0 && (
        <div className="card mt-5">
          <div className="mb-3.5 text-sm font-semibold text-[var(--ink)]">
            Historique des calculs enregistrés
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Date
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Scope
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Poste
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Site
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
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {h.scope ? `Scope ${h.scope}` : "—"}
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{h.processRef ?? "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{siteNameFor(h.siteId)}</td>
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