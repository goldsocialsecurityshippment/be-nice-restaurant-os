export type RestaurantEvent =
  | { type: "ORDER_CREATED"; restaurantId: string; orderId: string }
  | { type: "ORDER_UPDATED"; restaurantId: string; orderId: string; status: string }
  | { type: "TABLE_UPDATED"; restaurantId: string; tableId: string }
  | { type: "MENU_UPDATED"; restaurantId: string }
  | { type: "HELP_REQUEST_CREATED"; restaurantId: string; helpRequestId: string }
  | { type: "HELP_REQUEST_UPDATED"; restaurantId: string; helpRequestId: string; status: string }
  | { type: "NOTIFICATION_CREATED"; restaurantId: string; notificationId: string };

type Listener = (event: RestaurantEvent) => void;

class EventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: RestaurantEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Event listener error", err);
      }
    }
  }
}

const globalForEvents = globalThis as unknown as { restaurantEventBus: EventBus | undefined };
export const eventBus = globalForEvents.restaurantEventBus ?? new EventBus();
if (process.env.NODE_ENV !== "production") globalForEvents.restaurantEventBus = eventBus;

export function publishEvent(event: RestaurantEvent) {
  eventBus.publish(event);
}
