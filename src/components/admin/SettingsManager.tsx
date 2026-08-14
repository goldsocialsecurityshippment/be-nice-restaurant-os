"use client";

import { useEffect, useState } from "react";

type Settings = {
  estimatedPrepMinLow: number;
  estimatedPrepMinHigh: number;
  acceptingOrders: boolean;
  waitressServesDrinks: boolean;
  currency: string;
};
type Restaurant = {
  name: string;
  phone1: string | null;
  phone2: string | null;
  phone3: string | null;
  address: string | null;
  instagram: string | null;
  heroImageUrl: string | null;
};

export function SettingsManager({ restaurantId }: { restaurantId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/settings?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setRestaurant(data.restaurant);
      });
  }, [restaurantId]);

  async function uploadHeroImage(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json();
    setUploading(false);
    if (res.ok && restaurant) setRestaurant({ ...restaurant, heroImageUrl: data.url });
  }

  async function save() {
    if (!settings || !restaurant) return;
    setSaving(true);
    setSaved(false);
    await fetch(`/api/settings?restaurantId=${restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, ...restaurant }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!settings || !restaurant) {
    return <div className="p-6 text-bn-charcoal-soft">Loading settings…</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">System Settings</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Restaurant Info</h2>
          <div className="mt-3 space-y-3">
            <Field label="Name" value={restaurant.name} onChange={(v) => setRestaurant({ ...restaurant, name: v })} />
            <Field label="Address" value={restaurant.address ?? ""} onChange={(v) => setRestaurant({ ...restaurant, address: v })} />
            <Field label="Phone 1" value={restaurant.phone1 ?? ""} onChange={(v) => setRestaurant({ ...restaurant, phone1: v })} />
            <Field label="Phone 2" value={restaurant.phone2 ?? ""} onChange={(v) => setRestaurant({ ...restaurant, phone2: v })} />
            <Field label="Phone 3" value={restaurant.phone3 ?? ""} onChange={(v) => setRestaurant({ ...restaurant, phone3: v })} />
            <Field label="Instagram" value={restaurant.instagram ?? ""} onChange={(v) => setRestaurant({ ...restaurant, instagram: v })} />
          </div>
        </div>

        <div className="border border-bn-gold/20 bg-bn-cream p-5">
          <h2 className="font-display font-semibold text-bn-charcoal">Homepage Hero Image</h2>
          <p className="mt-1 text-xs text-bn-charcoal-soft">
            Swap in real food photography anytime — no code changes needed.
          </p>
          {restaurant.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.heroImageUrl} alt="Hero preview" className="mt-3 h-32 w-full rounded object-cover" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && uploadHeroImage(e.target.files[0])}
            className="mt-3 w-full text-xs"
          />
          {uploading && <p className="mt-1 text-xs text-bn-gold">Uploading…</p>}

          <h2 className="mt-6 font-display font-semibold text-bn-charcoal">Ordering</h2>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Accepting online orders</label>
              <input
                type="checkbox"
                checked={settings.acceptingOrders}
                onChange={(e) => setSettings({ ...settings, acceptingOrders: e.target.checked })}
                className="h-5 w-5"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Waitress serves drinks directly</label>
              <input
                type="checkbox"
                checked={settings.waitressServesDrinks}
                onChange={(e) => setSettings({ ...settings, waitressServesDrinks: e.target.checked })}
                className="h-5 w-5"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Estimated wait — low (min)</label>
              <input
                type="number"
                value={settings.estimatedPrepMinLow}
                onChange={(e) => setSettings({ ...settings, estimatedPrepMinLow: parseInt(e.target.value, 10) || 0 })}
                className="w-20 rounded border border-bn-gold/30 bg-transparent px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Estimated wait — high (min)</label>
              <input
                type="number"
                value={settings.estimatedPrepMinHigh}
                onChange={(e) => setSettings({ ...settings, estimatedPrepMinHigh: parseInt(e.target.value, 10) || 0 })}
                className="w-20 rounded border border-bn-gold/30 bg-transparent px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Currency code</label>
              <input
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-20 rounded border border-bn-gold/30 bg-transparent px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-bn-red px-6 py-2.5 text-sm font-semibold text-bn-cream disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-green-700">Saved ✓</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-bn-charcoal-soft">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
      />
    </div>
  );
}
