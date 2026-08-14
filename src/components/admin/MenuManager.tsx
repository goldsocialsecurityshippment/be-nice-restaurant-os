"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  isAvailable: boolean;
  isFeatured: boolean;
  categoryId: string;
};
type MenuCategory = { id: string; name: string; slug: string; items: MenuItem[] };

export function MenuManager({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  function refresh() {
    fetch(`/api/menu?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));
  }

  useEffect(refresh, [restaurantId]);

  async function toggleAvailability(item: MenuItem) {
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)),
      }))
    );
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Remove "${item.name}" from the menu?`)) return;
    await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    refresh();
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    await fetch("/api/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, name: newCategoryName, slug }),
    });
    setNewCategoryName("");
    refresh();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Menu Management</h1>
        <button
          onClick={() => setEditingItem({ categoryId: categories[0]?.id })}
          className="rounded-full bg-bn-red px-4 py-2 text-sm font-semibold text-bn-cream hover:bg-bn-red-dark"
        >
          + Add Menu Item
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name (e.g. Soups)"
          className="rounded border border-bn-gold/30 bg-bn-cream px-3 py-2 text-sm outline-none"
        />
        <button onClick={addCategory} className="rounded border border-bn-gold/40 px-3 py-2 text-sm font-semibold text-bn-charcoal hover:bg-bn-gold/10">
          Add Category
        </button>
      </div>

      <div className="mt-6 space-y-8">
        {categories.map((cat) => (
          <div key={cat.id}>
            <h2 className="font-display text-lg font-semibold text-bn-red">{cat.name}</h2>
            <div className="mt-3 overflow-hidden rounded border border-bn-gold/20">
              <table className="w-full text-sm">
                <thead className="bg-bn-cream-deep text-left text-xs uppercase tracking-wide text-bn-charcoal-soft">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((item) => (
                    <tr key={item.id} className="border-t border-bn-gold/10 bg-bn-cream">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-bn-gold">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.isAvailable ? "Available ✅" : "Out of Stock ❌"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingItem(item)} className="mr-3 text-xs font-semibold text-bn-charcoal hover:text-bn-red">
                          Edit
                        </button>
                        <button onClick={() => deleteItem(item)} className="text-xs font-semibold text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cat.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-xs text-bn-charcoal-soft">
                        No items in this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <ItemEditorModal
          restaurantId={restaurantId}
          categories={categories}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ItemEditorModal({
  restaurantId,
  categories,
  item,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  categories: MenuCategory[];
  item: Partial<MenuItem>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item.name ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    price: item.price ?? "",
    categoryId: item.categoryId ?? categories[0]?.id ?? "",
    isFeatured: item.isFeatured ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!item.id;

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    setForm((f) => ({ ...f, imageUrl: data.url }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      restaurantId,
      categoryId: form.categoryId,
      name: form.name,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      price: parseFloat(form.price as string),
      isFeatured: form.isFeatured,
    };
    const res = await fetch(isEdit ? `/api/menu/${item.id}` : "/api/menu", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? "Could not save item.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-bn-cream p-6">
        <h2 className="font-display text-lg font-semibold text-bn-charcoal">
          {isEdit ? "Edit Menu Item" : "Add Menu Item"}
        </h2>
        <div className="mt-4 space-y-3">
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Item name"
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            rows={2}
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="Image URL (Cloudinary link)"
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs text-bn-charcoal-soft">Or upload a photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="mt-1 w-full text-xs"
            />
            {uploading && <p className="mt-1 text-xs text-bn-gold">Uploading…</p>}
            {form.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="Preview" className="mt-2 h-20 w-20 rounded object-cover" />
            )}
          </div>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="Price (GHS)"
            className="w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            />
            Feature on homepage
          </label>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-bn-gold/40 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name || !form.price}
            className="flex-1 rounded-full bg-bn-red py-2 text-sm font-semibold text-bn-cream disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
