"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchCompanies,
  createCompanyApi,
  updateCompanyApi,
  deleteCompanyApi,
  ApiError,
  type ApiCompany,
} from "@/lib/api";

const emptyForm = {
  name: "",
  taxId: "",
  sector: "",
  country: "",
};

export default function CompaniesPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ApiCompany | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCompanies(token);
      setCompanies(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreateModal() {
    setEditingCompany(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(company: ApiCompany) {
    setEditingCompany(company);
    setForm({
      name: company.name,
      taxId: company.taxId,
      sector: company.sector ?? "",
      country: company.country ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      if (editingCompany) {
        await updateCompanyApi(token, editingCompany.id, {
          name: form.name,
          taxId: form.taxId,
          sector: form.sector || undefined,
          country: form.country || undefined,
        });
      } else {
        await createCompanyApi(token, {
          name: form.name,
          taxId: form.taxId,
          sector: form.sector || undefined,
          country: form.country || undefined,
        });
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(company: ApiCompany) {
    if (!token) return;
    if (!confirm(`Supprimer l'entreprise ${company.name} ?`)) return;
    try {
      await deleteCompanyApi(token, company.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression");
    }
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Administration
        </div>
        <h1 className="text-[25px]">Entreprises clientes</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Gestion des entreprises clientes de la plateforme.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="card">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--ink)]">Entreprises</div>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            + Ajouter une entreprise
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Chargement…</div>
        ) : companies.length === 0 ? (
          <div className="rounded-[10px] border-[1.5px] border-dashed border-[var(--line)] p-6.5 text-center text-[13px] text-[var(--text-faint)]">
            Aucune entreprise pour le moment.
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Nom
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Identifiant fiscal
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Secteur
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Pays
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--paper)]">
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{c.name}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{c.taxId}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{c.sector ?? "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{c.country ?? "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    <div className="flex gap-2">
                      <button className="btn btn-sm" onClick={() => openEditModal(c)}>
                        Gérer
                      </button>
                      <button className="btn btn-sm" onClick={() => handleDelete(c)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
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
              <h3 className="text-[16.5px]">
                {editingCompany ? "Modifier l'entreprise" : "Ajouter une entreprise"}
              </h3>
              <button
                className="text-lg text-[var(--text-faint)] hover:text-[var(--ink)]"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="px-5.5 py-5">
              <div className="mb-3.5">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                  Nom de l&apos;entreprise
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="mb-3.5">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                  Identifiant fiscal
                </label>
                <input
                  className="input-field"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                />
              </div>
              <div className="mb-3.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                    Secteur
                  </label>
                  <input
                    className="input-field"
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                    Pays
                  </label>
                  <input
                    className="input-field"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[var(--line)] px-5.5 py-4">
              <button className="btn" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement…" : editingCompany ? "Enregistrer" : "Créer l'entreprise"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}