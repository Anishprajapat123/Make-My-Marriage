import {
  notificationRequest,
  readJsonBody,
} from "@/modules/notifications/notification.http";
import { markRead } from "@/modules/notifications/notification.service";
export function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  return notificationRequest(async (ctx) =>
    markRead(ctx, (await params).notificationId, await readJsonBody(request)),
  );
}
