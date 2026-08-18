"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchSites,
  createSiteApi,
  updateSiteApi,
  deleteSiteApi,
  fetchSuppliers,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
  fetchTargets,
  createTargetApi,
  updateTargetApi,
  deleteTargetApi,
  ApiError,
  type ApiSite,
  type ApiSupplier,
  type ApiTarget,
} from "@/lib/api";

type Tab = "sites" | "suppliers" | "targets";

export default function WorkspacePerimeterPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const companyId = session?.user?.companyId;

  const [tab, setTab] = useState<Tab>("sites");
  const [error, setError] = useState("");

  const [sites, setSites] = useState<ApiSite[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [targets, setTargets] = useState<ApiTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [siteForm, setSiteForm] = useState({ name: "", country: "", city: "", siteType: "", address: "" });
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    country: "",
    sector: "",
    siteId: "",
    address: "",
  });
  const [targetForm, setTargetForm] = useState({
    name: "",
    metric: "",
    baselineValue: "",
    baselineYear: "",
    targetValue: "",
    targetYear: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !companyId) return;
    setLoading(true);
    setError("");
    try {
      const sitesData = await fetchSites(token, companyId);
      setSites(sitesData);
      if (tab === "suppliers") setSuppliers(await fetchSuppliers(token, companyId));
      if (tab === "targets") setTargets(await fetchTargets(token, companyId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token, companyId, tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function siteName(siteId?: string) {
    if (!siteId) return "—";
    return sites.find((s) => s.id === siteId)?.name ?? "—";
  }

  function openCreateModal() {
    setEditingId(null);
    setSiteForm({ name: "", country: "", city: "", siteType: "", address: "" });
    setSupplierForm({ name: "", country: "", sector: "", siteId: "", address: "" });
    setTargetForm({ name: "", metric: "", baselineValue: "", baselineYear: "", targetValue: "", targetYear: "" });
    setModalOpen(true);
  }

  function openEditModal(item: ApiSite | ApiSupplier | ApiTarget) {
    setEditingId(item.id);
    if (tab === "sites") {
      const s = item as ApiSite;
      setSiteForm({
        name: s.name,
        country: s.country ?? "",
        city: s.city ?? "",
        siteType: s.siteType ?? "",
        address: s.address ?? "",
      });
    } else if (tab === "suppliers") {
      const s = item as ApiSupplier;
      setSupplierForm({
        name: s.name,
        country: s.country ?? "",
        sector: s.sector ?? "",
        siteId: s.siteId ?? "",
        address: s.address ?? "",
      });
    } else {
      const t = item as ApiTarget;
      setTargetForm({
        name: t.name,
        metric: t.metric,
        baselineValue: t.baselineValue?.toString() ?? "",
        baselineYear: t.baselineYear?.toString() ?? "",
        targetValue: t.targetValue?.toString() ?? "",
        targetYear: t.targetYear?.toString() ?? "",
      });
    }
    setModalOpen(true);
  }

  async function handleSave() {
    if (!token || !companyId) return;
    setSaving(true);
    setError("");
    try {
      if (tab === "sites") {
        if (editingId) await updateSiteApi(token, editingId, siteForm);
        else await createSiteApi(token, { ...siteForm, companyId });
      } else if (tab === "suppliers") {
        const payload = {
          name: supplierForm.name,
          country: supplierForm.country || undefined,
          sector: supplierForm.sector || undefined,
          siteId: supplierForm.siteId || undefined,
          address: supplierForm.address || undefined,
        };
        if (editingId) await updateSupplierApi(token, editingId, payload);
        else await createSupplierApi(token, { ...payload, companyId });
      } else {
        const payload = {
          name: targetForm.name,
          metric: targetForm.metric,
          baselineValue: targetForm.baselineValue ? Number(targetForm.baselineValue) : undefined,
          baselineYear: targetForm.baselineYear ? Number(targetForm.baselineYear) : undefined,
          targetValue: targetForm.targetValue ? Number(targetForm.targetValue) : undefined,
          targetYear: targetForm.targetYear ? Number(targetForm.targetYear) : undefined,
        };
        if (editingId) await updateTargetApi(token, editingId, payload);
        else await createTargetApi(token, { ...payload, companyId });
      }
      setModalOpen(false);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Supprimer cet élément ?")) return;
    try {
      if (tab === "sites") await deleteSiteApi(token, id);
      else if (tab === "suppliers") await deleteSupplierApi(token, id);
      else await deleteTargetApi(token, id);
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression");
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
        <h1 className="text-[25px]">Périmètre</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Gestion de vos sites, fournisseurs et objectifs. La distance fournisseur-site est
          calculée automatiquement à partir des adresses renseignées.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["sites", "suppliers", "targets"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? "btn-primary" : ""}`}
          >
            {t === "sites" ? "Sites" : t === "suppliers" ? "Fournisseurs" : "Objectifs"}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--ink)]">
            {tab === "sites" ? "Sites" : tab === "suppliers" ? "Fournisseurs" : "Objectifs"}
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            + Ajouter
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Chargement…</div>
        ) : tab === "sites" ? (
          sites.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <Head cols={["Nom", "Ville", "Pays", "Type", "Adresse", "Géocodé"]} />
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--paper)]">
                    <td className="border-b border-[var(--line)] px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.city ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.country ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.siteType ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.address ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      {s.latitude != null ? "✅" : s.address ? "⚠️" : "—"}
                    </td>
                    <RowActions onEdit={() => openEditModal(s)} onDelete={() => handleDelete(s.id)} />
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : tab === "suppliers" ? (
          suppliers.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <Head cols={["Nom", "Secteur", "Pays", "Adresse", "Site livré", "Distance calculée"]} />
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--paper)]">
                    <td className="border-b border-[var(--line)] px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.sector ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.country ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{s.address ?? "—"}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">{siteName(s.siteId)}</td>
                    <td className="border-b border-[var(--line)] px-3 py-2.5">
                      {s.distanceKm != null ? (
                        `${s.distanceKm} km`
                      ) : s.address && s.siteId ? (
                        <span className="text-[var(--text-faint)]">⚠️ non calculée</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <RowActions onEdit={() => openEditModal(s)} onDelete={() => handleDelete(s.id)} />
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : targets.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <Head cols={["Nom", "Métrique", "Référence", "Cible"]} />
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--paper)]">
                  <td className="border-b border-[var(--line)] px-3 py-2.5 font-medium">{t.name}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{t.metric}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {t.baselineValue ?? "—"} ({t.baselineYear ?? "—"})
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {t.targetValue ?? "—"} ({t.targetYear ?? "—"})
                  </td>
                  <RowActions onEdit={() => openEditModal(t)} onDelete={() => handleDelete(t.id)} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,35,28,0.45)] p-5">
          <div className="w-full max-w-[520px] rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5.5 py-4.5">
              <h3 className="text-[16.5px]">{editingId ? "Modifier" : "Ajouter"}</h3>
              <button className="text-lg text-[var(--text-faint)] hover:text-[var(--ink)]" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="px-5.5 py-5">
              {tab === "sites" && (
                <>
                  <Field label="Nom du site" value={siteForm.name} onChange={(v) => setSiteForm({ ...siteForm, name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ville" value={siteForm.city} onChange={(v) => setSiteForm({ ...siteForm, city: v })} />
                    <Field label="Pays" value={siteForm.country} onChange={(v) => setSiteForm({ ...siteForm, country: v })} />
                  </div>
                  <Field label="Type (usine, bureau...)" value={siteForm.siteType} onChange={(v) => setSiteForm({ ...siteForm, siteType: v })} />
                  <Field
                    label="Adresse complète"
                    value={siteForm.address}
                    onChange={(v) => setSiteForm({ ...siteForm, address: v })}
                  />
                  <p className="-mt-2.5 mb-3.5 text-[11.5px] text-[var(--text-faint)]">
                    Ex : &quot;12 Rue de la Paix, Tunis, Tunisie&quot;. Utilisée pour géocoder le
                    site et calculer automatiquement la distance avec ses fournisseurs.
                  </p>
                </>
              )}
              {tab === "suppliers" && (
                <>
                  <Field label="Nom du fournisseur" value={supplierForm.name} onChange={(v) => setSupplierForm({ ...supplierForm, name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Secteur" value={supplierForm.sector} onChange={(v) => setSupplierForm({ ...supplierForm, sector: v })} />
                    <Field label="Pays" value={supplierForm.country} onChange={(v) => setSupplierForm({ ...supplierForm, country: v })} />
                  </div>

                  <div className="mb-3.5">
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                      Site livré
                    </label>
                    <select
                      className="input-field"
                      value={supplierForm.siteId}
                      onChange={(e) => setSupplierForm({ ...supplierForm, siteId: e.target.value })}
                    >
                      <option value="">— Aucun —</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Field
                    label="Adresse complète du fournisseur"
                    value={supplierForm.address}
                    onChange={(v) => setSupplierForm({ ...supplierForm, address: v })}
                  />
                  <p className="-mt-2.5 mb-3.5 text-[11.5px] text-[var(--text-faint)]">
                    La distance jusqu&apos;au site sera calculée automatiquement après
                    enregistrement (adresse fournisseur ↔ adresse du site livré).
                  </p>
                </>
              )}
              {tab === "targets" && (
                <>
                  <Field label="Nom de l'objectif" value={targetForm.name} onChange={(v) => setTargetForm({ ...targetForm, name: v })} />
                  <Field label="Métrique (ex: emissions_co2)" value={targetForm.metric} onChange={(v) => setTargetForm({ ...targetForm, metric: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Valeur référence" value={targetForm.baselineValue} onChange={(v) => setTargetForm({ ...targetForm, baselineValue: v })} />
                    <Field label="Année référence" value={targetForm.baselineYear} onChange={(v) => setTargetForm({ ...targetForm, baselineYear: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Valeur cible" value={targetForm.targetValue} onChange={(v) => setTargetForm({ ...targetForm, targetValue: v })} />
                    <Field label="Année cible" value={targetForm.targetYear} onChange={(v) => setTargetForm({ ...targetForm, targetYear: v })} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[var(--line)] px-5.5 py-4">
              <button className="btn" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Head({ cols }: { cols: string[] }) {
  return (
    <tr>
      {cols.map((c) => (
        <th key={c} className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
          {c}
        </th>
      ))}
      <th className="border-b border-[var(--line)] px-3 py-2" />
    </tr>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <td className="border-b border-[var(--line)] px-3 py-2.5">
      <div className="flex gap-2">
        <button className="btn btn-sm" onClick={onEdit}>
          Modifier
        </button>
        <button className="btn btn-sm" onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </td>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border-[1.5px] border-dashed border-[var(--line)] p-6.5 text-center text-[13px] text-[var(--text-faint)]">
      Aucune donnée pour le moment.
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">{label}</label>
      <input className="input-field" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}