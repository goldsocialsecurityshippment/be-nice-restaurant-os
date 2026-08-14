import { NextRequest } from "next/server";
import { eventBus, type RestaurantEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/events?restaurantId=xxx
 * Server-Sent Events stream. Kitchen and Waitress dashboards keep this
 * connection open and receive ORDER_CREATED / ORDER_UPDATED / TABLE_UPDATED
 * events instantly, instead of polling.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial handshake so the client knows the connection is live.
      send({ type: "CONNECTED" });

      const unsubscribe = eventBus.subscribe((event: RestaurantEvent) => {
        if (!restaurantId || event.restaurantId === restaurantId) {
          send(event);
        }
      });

      // Heartbeat to keep intermediary proxies/load balancers from closing the connection.
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 25000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
