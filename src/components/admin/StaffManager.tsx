"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
};

type Performance = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  ordersCreated: number;
  ordersAccepted: number;
  itemsPrepared: number;
  ordersServed: number;
  helpRequestsHandled: number;
  totalActions: number;
};

const ROLES = ["ADMIN", "MANAGER", "KITCHEN", "BAR", "WAITRESS", "CASHIER"];

export function StaffManager({ restaurantId, viewerRole }: { restaurantId: string; viewerRole: string }) {
  const isAdmin = viewerRole === "ADMIN";
  const [tab, setTab] = useState<"staff" | "performance">(isAdmin ? "staff" : "performance");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "WAITRESS" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch(`/api/staff?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setStaff(data.staff ?? []));
  }

  function refreshPerformance() {
    fetch(`/api/staff/performance?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setPerformance(data.performance ?? []));
  }

  useEffect(refresh, [restaurantId]);
  useEffect(() => {
    if (tab === "performance") refreshPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshPerformance is stable per restaurantId; re-declaring it in deps would refetch on every render.
  }, [tab, restaurantId]);

  async function createStaff() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Could not create staff account.");
      return;
    }
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", password: "", role: "WAITRESS" });
    refresh();
  }

  async function toggleActive(member: Staff) {
    await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    refresh();
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Staff Management</h1>
        {isAdmin && tab === "staff" && (
          <button onClick={() => setShowForm(true)} className="rounded-full bg-bn-red px-4 py-2 text-sm font-semibold text-bn-cream">
            + Add Staff
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {(["staff", "performance"] as const)
          .filter((t) => isAdmin || t !== "staff")
          .map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "border-bn-red bg-bn-red text-bn-cream" : "border-bn-gold/30 text-bn-charcoal-soft"
            }`}
          >
            {t === "staff" ? "Accounts" : "Performance"}
          </button>
        ))}
      </div>

      {isAdmin && tab === "staff" && (
        <div className="mt-5 overflow-x-auto rounded border border-bn-gold/20">
          <table className="w-full text-sm">
            <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Login</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t border-bn-gold/10 bg-bn-cream">
                  <td className="px-3 py-2 font-medium">{member.name}</td>
                  <td className="px-3 py-2 text-xs text-bn-charcoal-soft">{member.email ?? member.phone}</td>
                  <td className="px-3 py-2">{member.role}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.isActive ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"}`}>
                      {member.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => toggleActive(member)} className="text-xs font-semibold text-bn-charcoal hover:text-bn-red">
                      {member.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "performance" && (
        <div className="mt-5 overflow-x-auto rounded border border-bn-gold/20">
          <table className="w-full text-sm">
            <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Accepted</th>
                <th className="px-3 py-2">Prepared</th>
                <th className="px-3 py-2">Served</th>
                <th className="px-3 py-2">Help Handled</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.id} className="border-t border-bn-gold/10 bg-bn-cream">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.role}</td>
                  <td className="px-3 py-2">{p.ordersCreated}</td>
                  <td className="px-3 py-2">{p.ordersAccepted}</td>
                  <td className="px-3 py-2">{p.itemsPrepared}</td>
                  <td className="px-3 py-2">{p.ordersServed}</td>
                  <td className="px-3 py-2">{p.helpRequestsHandled}</td>
                </tr>
              ))}
              {performance.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-bn-charcoal-soft">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-bn-cream p-6">
            <h2 className="font-display text-lg font-semibold text-bn-charcoal">Add Staff Account</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Individual email (e.g. waitress.grace@benice)"
                className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (optional if email given)"
                className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Temporary password (min 8 chars)"
                className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-full border border-bn-gold/40 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button
                onClick={createStaff}
                disabled={saving || !form.name || !form.password}
                className="flex-1 rounded-full bg-bn-red py-2 text-sm font-semibold text-bn-cream disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
