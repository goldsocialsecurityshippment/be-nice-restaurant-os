"use client";

import { useEffect, useState } from "react";
import { useOrderEvents } from "@/lib/useOrderEvents";

type Seat = { id: string; seatNumber: number; status: string };
type Table = {
  id: string;
  label: string;
  number: number;
  capacity: number;
  status: string;
  seats: Seat[];
  qrCode: { imageDataUrl: string | null; targetUrl: string } | null;
};

export function TableManager({ restaurantId }: { restaurantId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [creating, setCreating] = useState(false);
  const [qrPreview, setQrPreview] = useState<Table | null>(null);

  function refresh() {
    fetch(`/api/tables?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => setTables(data.tables ?? []));
  }

  useEffect(refresh, [restaurantId]);

  useOrderEvents(restaurantId, (event) => {
    if (event.type === "TABLE_UPDATED") refresh();
  });

  async function createTable() {
    if (!label.trim() || !number) return;
    setCreating(true);
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        label,
        number: parseInt(number, 10),
        capacity: parseInt(capacity, 10),
      }),
    });
    setCreating(false);
    setLabel("");
    setNumber("");
    refresh();
  }

  async function deleteTable(id: string) {
    if (!confirm("Delete this table and its QR code?")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-semibold text-bn-charcoal">Tables &amp; QR Codes</h1>
      <p className="text-sm text-bn-charcoal-soft">
        Every table gets a unique QR code. Print and place it on the table — customers scan it to order directly.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-2 border border-bn-gold/20 bg-bn-cream p-4">
        <div>
          <label className="text-xs text-bn-charcoal-soft">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Table 5"
            className="block rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-bn-charcoal-soft">Number</label>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="5"
            className="block w-24 rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-bn-charcoal-soft">Capacity</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="block w-24 rounded border border-bn-gold/30 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={createTable}
          disabled={creating}
          className="rounded-full bg-bn-red px-4 py-2 text-sm font-semibold text-bn-cream disabled:opacity-60"
        >
          {creating ? "Creating…" : "+ Create Table & QR"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <div key={table.id} className="border border-bn-gold/20 bg-bn-cream p-4 text-center">
            <p className="font-display font-semibold text-bn-charcoal">{table.label}</p>
            <p className="text-xs text-bn-charcoal-soft">Seats {table.capacity} · {table.status.replace("_", " ")}</p>
            {table.seats.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1 text-xs">
                {table.seats.map((seat) => (
                  <span key={seat.id} title={`Seat ${seat.seatNumber}: ${seat.status.replace("_", " ")}`}>
                    {seat.status === "AVAILABLE" ? "⚪" : "🟢"}
                    {seat.seatNumber}
                  </span>
                ))}
              </div>
            )}
            {table.qrCode?.imageDataUrl && (
              <button onClick={() => setQrPreview(table)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={table.qrCode.imageDataUrl} alt={`QR code for ${table.label}`} className="mx-auto mt-3 h-28 w-28" />
              </button>
            )}
            <div className="mt-3 flex justify-center gap-3 text-xs">
              <button onClick={() => setQrPreview(table)} className="font-semibold text-bn-charcoal hover:text-bn-red">
                View / Print
              </button>
              <button onClick={() => deleteTable(table.id)} className="font-semibold text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {qrPreview?.qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white" onClick={() => setQrPreview(null)}>
          <div className="w-full max-w-xs rounded-lg bg-bn-cream p-6 text-center print:shadow-none" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl font-semibold text-bn-charcoal">{qrPreview.label}</p>
            <p className="text-xs text-bn-charcoal-soft">Scan to order</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrPreview.qrCode.imageDataUrl ?? ""} alt="QR code" className="mx-auto mt-4 h-56 w-56" />
            <p className="mt-3 break-all text-[10px] text-bn-charcoal-soft">{qrPreview.qrCode.targetUrl}</p>
            <div className="mt-4 flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="flex-1 rounded-full bg-bn-charcoal py-2 text-sm font-semibold text-bn-cream">
                Print
              </button>
              <button onClick={() => setQrPreview(null)} className="flex-1 rounded-full border border-bn-gold/40 py-2 text-sm font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
