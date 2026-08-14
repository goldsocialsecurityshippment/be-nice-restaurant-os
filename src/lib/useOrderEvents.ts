"use client";

import { useEffect, useRef } from "react";
import type { RestaurantEvent as ServerEvent } from "@/lib/events";

type RestaurantEvent = ServerEvent | { type: "CONNECTED" };

export function useOrderEvents(
  restaurantId: string | undefined,
  onEvent: (event: RestaurantEvent) => void,
) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!restaurantId) return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;
    let closed = false;

    const clearRetryTimer = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const connect = () => {
      if (closed) return;

      es?.close();

      const url = `/api/events?restaurantId=${encodeURIComponent(
        restaurantId,
      )}`;

      es = new EventSource(url);

      es.onopen = () => {
        console.log("[SSE] Connected");
        retryDelay = 1000;
        clearRetryTimer();
      };

      es.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data) as RestaurantEvent;

          // Pass the CONNECTED event to WaitressBoard.
          if (data.type === "CONNECTED") {
            onEventRef.current(data);
            return;
          }

          onEventRef.current(data);

          retryDelay = 1000;
        } catch (err) {
          console.error("[SSE] Bad payload", err);
        }
      };

      es.onerror = () => {
        console.warn("[SSE] Connection lost");

        es?.close();
        es = null;

        if (closed) return;

        clearRetryTimer();

        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, retryDelay);

        retryDelay = Math.min(retryDelay * 2, 15000);
      };
    };

    connect();

    return () => {
      closed = true;

      clearRetryTimer();

      es?.close();
      es = null;
    };
  }, [restaurantId]);
}