"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export type CartLine = {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  notes?: string;
};

type CartContextValue = {
  lines: CartLine[];
  addItem: (
    item: Omit<CartLine, "quantity">,
    quantity?: number
  ) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "benice-cart-v1";
const EMPTY_CART: CartLine[] = [];

function createCartStore() {
  let state: CartLine[] = [];
  const listeners = new Set<() => void>();

  function load(): CartLine[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }

  function persist() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }

  function set(next: CartLine[]) {
    state = next;
    persist();
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return state;
    },

    getServerSnapshot() {
      return EMPTY_CART;
    },

    hydrate() {
      const loaded = load();

      if (loaded.length > 0) {
        state = loaded;
      }

      listeners.forEach((listener) => listener());
    },

    addItem(
      item: Omit<CartLine, "quantity">,
      quantity = 1
    ) {
      const existing = state.find(
        (line) => line.menuItemId === item.menuItemId
      );

      if (existing) {
        set(
          state.map((line) =>
            line.menuItemId === item.menuItemId
              ? {
                  ...line,
                  quantity: line.quantity + quantity,
                }
              : line
          )
        );
      } else {
        set([
          ...state,
          {
            ...item,
            quantity,
          },
        ]);
      }
    },

    updateQuantity(
      menuItemId: string,
      quantity: number
    ) {
      set(
        quantity <= 0
          ? state.filter(
              (line) => line.menuItemId !== menuItemId
            )
          : state.map((line) =>
              line.menuItemId === menuItemId
                ? {
                    ...line,
                    quantity,
                  }
                : line
            )
      );
    },

    updateNotes(
      menuItemId: string,
      notes: string
    ) {
      set(
        state.map((line) =>
          line.menuItemId === menuItemId
            ? {
                ...line,
                notes,
              }
            : line
        )
      );
    },

    removeItem(menuItemId: string) {
      set(
        state.filter(
          (line) => line.menuItemId !== menuItemId
        )
      );
    },

    clear() {
      set([]);
    },
  };
}

const cartStore = createCartStore();

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

useEffect(() => {
  cartStore.hydrate();
}, []);

  const addItem = useCallback(
    (
      item: Omit<CartLine, "quantity">,
      quantity?: number
    ) => {
      cartStore.addItem(item, quantity);
    },
    []
  );

  const updateQuantity = useCallback(
    (menuItemId: string, quantity: number) => {
      cartStore.updateQuantity(menuItemId, quantity);
    },
    []
  );

  const updateNotes = useCallback(
    (menuItemId: string, notes: string) => {
      cartStore.updateNotes(menuItemId, notes);
    },
    []
  );

  const removeItem = useCallback(
    (menuItemId: string) => {
      cartStore.removeItem(menuItemId);
    },
    []
  );

  const clear = useCallback(() => {
    cartStore.clear();
  }, []);

  const subtotal = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );

  const itemCount = lines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        lines,
        addItem,
        updateQuantity,
        updateNotes,
        removeItem,
        clear,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within a CartProvider"
    );
  }

  return context;
}