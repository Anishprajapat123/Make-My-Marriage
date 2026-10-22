import { notificationRequest } from "@/modules/notifications/notification.http";
import { list } from "@/modules/notifications/notification.service";
export function GET(request: Request) {
  return notificationRequest((ctx) =>
    list(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
