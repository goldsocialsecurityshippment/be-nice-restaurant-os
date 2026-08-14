import { prisma } from "@/lib/prisma";

/**
 * Records a staff-accountability entry: who did what, when. Every
 * significant action (order accepted, item served, table freed, help
 * request resolved, menu changed, staff managed) should call this so
 * Admin's Activity Center and the staff performance dashboard have a
 * complete trail. Never throws — logging failures shouldn't break the
 * action that triggered them.
 */
export async function logAction(params: {
  restaurantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as never,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
