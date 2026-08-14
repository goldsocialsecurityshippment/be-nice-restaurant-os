
"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useOrderEvents } from "@/lib/useOrderEvents";
import { formatTime } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ManualOrderModal } from "@/components/waitress/ManualOrderModal";
import { HelpRequestModal } from "@/components/waitress/HelpRequestModal";

type OrderItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  notes: string | null;
  status: string;
  dashboardGroupSnapshot: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  table: { id: string; label: string } | null;
  items: OrderItem[];
  total: string;
};

type Seat = {
  id: string;
  seatNumber: number;
  status: string;
};

type Table = {
  id: string;
  label: string;
  number: number;
  capacity: number;
  status: string;
  seats: Seat[];
  orders: {
    id: string;
    orderNumber: string;
    status: string;
  }[];
};

type HelpRequest = {
  id: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  table: {
    id: string;
    label: string;
  };
  raisedBy: {
    name: string;
  } | null;
};

type ServableItem = {
  order: Order;
  item: OrderItem;
};

const REASON_LABELS: Record<string, string> = {
  CUSTOMER_COMPLAINT: "Customer Complaint",
  FOOD_TAKING_TOO_LONG: "Food Taking Too Long",
  ALLERGY_SPECIAL_REQUEST: "Allergy / Special Request",
  PAYMENT_ISSUE: "Payment Issue",
  MANAGER_NEEDED: "Manager Needed",
  SECURITY_EMERGENCY: "Security / Emergency",
  OTHER: "Other",
};

const ACTIVE_ORDER_STATUSES = "RECEIVED,ACCEPTED,PREPARING,READY";

export function WaitressBoard({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [tab, setTab] = useState<"ready" | "tables">("ready");
  const [orders, setOrders] = useState<Order[]>([]);
  const [waitressServesDrinks, setWaitressServesDrinks] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [connected, setConnected] = useState(false);

  const [manualOrderTable, setManualOrderTable] =
    useState<Table | null>(null);

  const [helpRequestTable, setHelpRequestTable] =
    useState<Table | null>(null);

  const refreshOrders = useCallback(() => {
    fetch(
      `/api/orders?restaurantId=${restaurantId}&status=${ACTIVE_ORDER_STATUSES}`,
    )
      .then((response) => response.json())
      .then((data) => {
        setOrders(data.orders ?? []);
      })
      .catch((error) => {
        console.error("Failed to load orders:", error);
      });
  }, [restaurantId]);

  const refreshSettings = useCallback(() => {
    fetch(`/api/settings?restaurantId=${restaurantId}`)
      .then((response) => response.json())
      .then((data) => {
        setWaitressServesDrinks(
          !!data.settings?.waitressServesDrinks,
        );
      })
      .catch((error) => {
        console.error("Failed to load settings:", error);
      });
  }, [restaurantId]);

  const refreshTables = useCallback(() => {
    fetch(`/api/tables?restaurantId=${restaurantId}`)
      .then((response) => response.json())
      .then((data) => {
        setTables(data.tables ?? []);
      })
      .catch((error) => {
        console.error("Failed to load tables:", error);
      });
  }, [restaurantId]);

  const refreshHelpRequests = useCallback(() => {
    fetch(
      `/api/help-requests?restaurantId=${restaurantId}&status=NEW,IN_PROGRESS`,
    )
      .then((response) => response.json())
      .then((data) => {
        setHelpRequests(data.helpRequests ?? []);
      })
      .catch((error) => {
        console.error("Failed to load help requests:", error);
      });
  }, [restaurantId]);

  useEffect(() => {
    refreshOrders();
    refreshSettings();
    refreshTables();
    refreshHelpRequests();
  }, [
    refreshOrders,
    refreshSettings,
    refreshTables,
    refreshHelpRequests,
  ]);

  useOrderEvents(restaurantId, (event) => {
    setConnected(true);

    if (
      event.type === "ORDER_CREATED" ||
      event.type === "ORDER_UPDATED"
    ) {
      refreshOrders();
      refreshTables();
    }

    if (event.type === "TABLE_UPDATED") {
      refreshTables();
    }

    if (
      event.type === "HELP_REQUEST_CREATED" ||
      event.type === "HELP_REQUEST_UPDATED"
    ) {
      refreshHelpRequests();
    }
  });

  async function serveItem(itemId: string) {
    setOrders((previous) =>
      previous.map((order) => ({
        ...order,
        items: order.items.map((item) =>
          item.id === itemId
            ? { ...item, status: "SERVED" }
            : item,
        ),
      })),
    );

    const response = await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "SERVED",
      }),
    });

    if (!response.ok) {
      refreshOrders();
    }
  }

  async function resolveHelpRequest(id: string) {
    setHelpRequests((previous) =>
      previous.filter((request) => request.id !== id),
    );

    await fetch(`/api/help-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "RESOLVED",
      }),
    });

    refreshTables();
  }

  async function markTableAvailable(table: Table) {
    setTables((previous) =>
      previous.map((currentTable) =>
        currentTable.id === table.id
          ? {
              ...currentTable,
              status: "AVAILABLE",
            }
          : currentTable,
      ),
    );

    const response = await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "AVAILABLE",
      }),
    });

    if (!response.ok) {
      refreshTables();
    }
  }

  async function toggleSeat(seat: Seat) {
    const nextStatus =
      seat.status === "AVAILABLE"
        ? "OCCUPIED"
        : "AVAILABLE";

    setTables((previous) =>
      previous.map((table) => ({
        ...table,
        seats: table.seats.map((currentSeat) =>
          currentSeat.id === seat.id
            ? {
                ...currentSeat,
                status: nextStatus,
              }
            : currentSeat,
        ),
      })),
    );

    const response = await fetch(`/api/seats/${seat.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    if (!response.ok) {
      refreshTables();
    }
  }

  const servableItems: ServableItem[] = orders
    .filter(
      (order) =>
        order.status !== "RECEIVED" &&
        order.status !== "CANCELLED",
    )
    .flatMap((order) =>
      order.items
        .filter((item) => {
          if (item.status === "SERVED") {
            return false;
          }

          if (item.status === "READY") {
            return true;
          }

          return (
            waitressServesDrinks &&
            item.dashboardGroupSnapshot === "BAR"
          );
        })
        .map((item) => ({
          order,
          item,
        })),
    )
    .sort(
      (a, b) =>
        new Date(a.order.createdAt).getTime() -
        new Date(b.order.createdAt).getTime(),
    );

  const statusStyles: Record<string, string> = {
    AVAILABLE:
      "border-bn-gold/20 bg-bn-cream",

    OCCUPIED:
      "border-bn-charcoal/30 bg-bn-cream-deep",

    NEEDS_ATTENTION:
      "border-bn-red bg-bn-red/10 animate-pulse",

    RESERVED:
      "border-bn-gold bg-bn-gold/10",
  };

  return (
    <div className="min-h-screen bg-bn-cream">
      <header className="bg-bn-charcoal px-4 py-4 text-bn-cream sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold">
              Waitress Dashboard
            </h1>

            <p className="mt-1 text-xs text-bn-cream/60">
              {connected ? "● Live" : "○ Connecting..."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell restaurantId={restaurantId} />

            <button
              onClick={() =>
                signOut({
                  callbackUrl: "/login",
                })
              }
              className="text-sm text-bn-cream/60 transition hover:text-bn-cream"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {helpRequests.length > 0 && (
        <div className="border-b border-bn-red/30 bg-bn-red/10 px-4 py-3 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-bn-red">
            {helpRequests.length} table
            {helpRequests.length > 1 ? "s" : ""} need help
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {helpRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-2 rounded-full border border-bn-red/40 bg-bn-cream px-3 py-1 text-xs"
              >
                <span className="font-semibold">
                  {request.table.label}
                </span>

                <span className="text-bn-charcoal-soft">
                  {REASON_LABELS[request.reason] ??
                    request.reason}
                </span>

                <button
                  onClick={() =>
                    resolveHelpRequest(request.id)
                  }
                  className="font-semibold text-green-700 hover:underline"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-bn-gold/20 bg-bn-cream px-4 pt-4 sm:px-6">
        {(["ready", "tables"] as const).map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab)}
            className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-semibold ${
              tab === currentTab
                ? "bg-bn-red text-bn-cream"
                : "text-bn-charcoal-soft"
            }`}
          >
            {currentTab === "ready"
              ? `Ready to Serve (${servableItems.length})`
              : "Tables"}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {tab === "ready" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servableItems.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-bn-charcoal-soft">
                Nothing waiting to be served.
              </p>
            )}

            {servableItems.map(({ order, item }) => (
              <div
                key={item.id}
                className="border border-green-300 bg-green-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-bn-charcoal">
                    {order.orderNumber}
                  </span>

                  <span className="text-xs text-bn-charcoal-soft">
                    {formatTime(order.createdAt)}
                  </span>
                </div>

                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                  {order.table
                    ? order.table.label
                    : "Pickup"}

                  {item.dashboardGroupSnapshot === "BAR" &&
                    " · Drink"}
                </p>

                <p className="mt-2 text-sm text-bn-charcoal-soft">
                  {item.nameSnapshot} × {item.quantity}
                </p>

                <button
                  onClick={() => serveItem(item.id)}
                  className="mt-3 w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 sm:py-2 sm:text-xs"
                >
                  Served
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "tables" && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`border p-4 transition ${
                  statusStyles[table.status] ??
                  statusStyles.AVAILABLE
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-bn-charcoal">
                    {table.label}
                  </span>

                  <span className="text-xs text-bn-charcoal-soft">
                    Seats {table.capacity}
                  </span>
                </div>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-bn-charcoal-soft">
                  {table.status.replace("_", " ")}
                </p>

                {table.orders.length > 0 && (
                  <p className="mt-1 text-xs text-bn-charcoal-soft">
                    {table.orders.length} active order
                    {table.orders.length > 1 ? "s" : ""}
                  </p>
                )}

                {table.seats.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold text-bn-charcoal-soft">
                      Seats
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {table.seats.map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeat(seat)}
                          title={`Seat ${seat.seatNumber} - ${seat.status.replace(
                            "_",
                            " ",
                          )}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${
                            seat.status === "AVAILABLE"
                              ? "border-bn-gold/30 bg-bn-cream text-bn-charcoal-soft hover:border-green-600 hover:bg-green-50"
                              : "border-green-600 bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {seat.seatNumber}
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 text-[11px] text-bn-charcoal-soft">
                      Tap a seat to mark it{" "}
                      {table.seats.some(
                        (seat) => seat.status === "OCCUPIED",
                      )
                        ? "available or occupied"
                        : "occupied"}.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setHelpRequestTable(table)
                    }
                    className="flex-1 rounded-full border border-bn-red px-2 py-2 text-xs font-semibold text-bn-red hover:bg-bn-red hover:text-bn-cream"
                  >
                    Request Help
                  </button>

                  <button
                    onClick={() =>
                      setManualOrderTable(table)
                    }
                    className="flex-1 rounded-full bg-bn-charcoal px-2 py-2 text-xs font-semibold text-bn-cream hover:bg-bn-red"
                  >
                    New Order
                  </button>
                </div>

                {table.status !== "AVAILABLE" && (
                  <button
                    onClick={() => markTableAvailable(table)}
                    className="mt-2 w-full rounded-full bg-green-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-green-700"
                  >
                    ✓ Mark Table Available
                  </button>
                )}

                {table.status === "AVAILABLE" && (
                  <div className="mt-2 rounded-full bg-green-100 px-3 py-2 text-center text-xs font-semibold text-green-700">
                    ✓ Table Available
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {manualOrderTable && (
        <ManualOrderModal
          restaurantId={restaurantId}
          table={manualOrderTable}
          onClose={() => setManualOrderTable(null)}
          onCreated={() => {
            setManualOrderTable(null);
            refreshOrders();
            refreshTables();
          }}
        />
      )}

      {helpRequestTable && (
        <HelpRequestModal
          restaurantId={restaurantId}
          tableId={helpRequestTable.id}
          tableLabel={helpRequestTable.label}
          onClose={() => setHelpRequestTable(null)}
          onSent={() => {
            setHelpRequestTable(null);
            refreshTables();
            refreshHelpRequests();
          }}
        />
      )}
    </div>
  );
}





