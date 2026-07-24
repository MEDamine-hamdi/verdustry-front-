"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  fetchUsers,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  fetchCompanies,
  ApiError,
  type ApiUser,
  type ApiCompany,
} from "@/lib/api";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

const emptyForm = {
  email: "",
  name: "",
  password: "",
  role: "ESG_MANAGER" as Role,
  companyId: "",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [usersData, companiesData] = await Promise.all([
        fetchUsers(token),
        fetchCompanies(token),
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
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
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(user: ApiUser) {
    setEditingUser(user);
    setForm({
      email: user.email,
      name: user.name ?? "",
      password: "",
      role: user.role,
      companyId: user.companyId ?? "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      if (editingUser) {
        await updateUserApi(token, editingUser.id, {
          email: form.email,
          name: form.name,
          role: form.role,
          companyId: form.role === "ADMIN" ? undefined : form.companyId,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await createUserApi(token, {
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role,
          companyId: form.role === "ADMIN" ? undefined : form.companyId,
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

  async function handleDelete(user: ApiUser) {
    if (!token) return;
    if (!confirm(`Supprimer l'utilisateur ${user.email} ?`)) return;
    try {
      await deleteUserApi(token, user.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression");
    }
  }

  function companyName(id?: string) {
    if (!id) return "—";
    return companies.find((c) => c.id === id)?.name ?? id;
  }

  return (
    <div>
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--moss)]">
          Administration
        </div>
        <h1 className="text-[25px]">Utilisateurs &amp; rôles</h1>
        <p className="mt-1.5 max-w-[640px] text-[13.5px] text-[var(--text-soft)]">
          Gestion des comptes et des permissions par rôle.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] border border-[#eecdc2] bg-[#f8e6e1] px-3.5 py-2.5 text-[12.5px] text-[#8a3320]">
          {error}
        </div>
      )}

      <div className="card">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--ink)]">Utilisateurs</div>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            + Inviter un utilisateur
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="rounded-[10px] border-[1.5px] border-dashed border-[var(--line)] p-6.5 text-center text-[13px] text-[var(--text-faint)]">
            Aucun utilisateur pour le moment.
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Email
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Rôle
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Entreprise
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-faint)]">
                  Statut
                </th>
                <th className="border-b border-[var(--line)] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--paper)]">
                  <td className="border-b border-[var(--line)] px-3 py-2.5">{u.email}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    <span className="badge badge-role">{u.role}</span>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    {companyName(u.companyId)}
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    <span className={u.isActive ? "badge badge-active" : "badge badge-inactive"}>
                      {u.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-3 py-2.5">
                    <div className="flex gap-2">
                      <button className="btn btn-sm" onClick={() => openEditModal(u)}>
                        Gérer
                      </button>
                      <button className="btn btn-sm" onClick={() => handleDelete(u)}>
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
                {editingUser ? "Modifier l'utilisateur" : "Inviter un utilisateur"}
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
                  Nom complet
                </label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="mb-3.5">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="mb-3.5 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                    Rôle
                  </label>
                  <select
                    className="input-field"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                    Entreprise
                  </label>
                  <select
                    className="input-field"
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    disabled={form.role === "ADMIN"}
                  >
                    <option value="">—</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3.5">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-soft)]">
                  Mot de passe {editingUser && "(laisser vide pour ne pas changer)"}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[var(--line)] px-5.5 py-4">
              <button className="btn" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement…" : editingUser ? "Enregistrer" : "Créer l'utilisateur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}