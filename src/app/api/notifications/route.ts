import { NextResponse } from "next/server";
import { GET as getCheckouts } from "@/actions/route";
import { getPatronHolds, getPatronProfile } from "@/actions/patron";

export const dynamic = "force-dynamic";

type NotificationType = "overdue" | "due_soon" | "hold_ready" | "fine";
type NotificationSeverity = "high" | "medium" | "info";

type NotificationRecord = {
  id: string;
  type: NotificationType;
  message: string;
  severity: NotificationSeverity;
};

type CheckoutRecord = {
  checkout_id?: number | string;
  due_date?: string;
  title?: string;
  item?: {
    title?: string;
    biblio?: {
      title?: string;
    };
  };
  biblio?: {
    title?: string;
  };
};

type HoldRecord = {
  hold_id?: number | string;
  reserve_id?: number | string;
  biblio_id?: number | string;
  item_id?: number | string;
  title?: string;
  status?: string;
  found?: string;
  pickup_library_id?: string;
  item?: {
    title?: string;
    biblio?: {
      title?: string;
    };
  };
  biblio?: {
    title?: string;
  };
};

type CheckoutsPayload = {
  checkouts?: CheckoutRecord[];
};

function resolveCheckoutTitle(checkout: CheckoutRecord): string {
  return checkout.item?.biblio?.title || checkout.biblio?.title || checkout.item?.title || checkout.title || "Unknown title";
}

function resolveHoldTitle(hold: HoldRecord): string {
  return hold.item?.biblio?.title || hold.biblio?.title || hold.item?.title || hold.title || "Unknown title";
}

function startOfDay(value: Date): number {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

function buildCheckoutNotifications(checkouts: CheckoutRecord[]): NotificationRecord[] {
  const today = startOfDay(new Date());

  return checkouts.flatMap((checkout) => {
    if (!checkout.due_date || !checkout.checkout_id) {
      return [];
    }

    const dueDate = new Date(checkout.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return [];
    }

    const dueTime = startOfDay(dueDate);
    const daysUntilDue = Math.round((dueTime - today) / 86400000);
    const title = resolveCheckoutTitle(checkout);

    if (daysUntilDue < 0) {
      return [
        {
          id: `overdue-${checkout.checkout_id}`,
          type: "overdue",
          severity: "high",
          message: `"${title}" is overdue. Please renew or return it.`,
        },
      ];
    }

    if (daysUntilDue <= 3) {
      const formattedDate = dueDate.toLocaleDateString();
      return [
        {
          id: `due-soon-${checkout.checkout_id}`,
          type: "due_soon",
          severity: daysUntilDue === 0 ? "high" : "medium",
          message: `"${title}" is due on ${formattedDate}.`,
        },
      ];
    }

    return [];
  });
}

function isHoldReady(hold: HoldRecord): boolean {
  if (hold.found === "W") {
    return true;
  }

  return typeof hold.status === "string" && hold.status.toLowerCase().includes("ready");
}

function buildHoldNotifications(holds: HoldRecord[]): NotificationRecord[] {
  return holds.flatMap((hold) => {
    if (!isHoldReady(hold)) {
      return [];
    }

    const location = hold.pickup_library_id ? ` at ${hold.pickup_library_id}` : "";

    return [
      {
        id: `hold-ready-${String(hold.hold_id || hold.reserve_id || hold.biblio_id || hold.item_id || resolveHoldTitle(hold))}`,
        type: "hold_ready",
        severity: "info",
        message: `"${resolveHoldTitle(hold)}" is ready for pickup${location}.`,
      },
    ];
  });
}

function severityRank(severity: NotificationSeverity): number {
  switch (severity) {
    case "high":
      return 0;
    case "medium":
      return 1;
    default:
      return 2;
  }
}

export async function GET() {
  const profile = await getPatronProfile();

  if (!profile?.id) {
    return NextResponse.json({ notifications: [] });
  }

  const [checkoutsResponse, holdsResult] = await Promise.all([
    getCheckouts(),
    getPatronHolds(),
  ]);

  const checkoutsPayload = (await checkoutsResponse.json().catch(() => null)) as CheckoutsPayload | null;
  const checkouts = Array.isArray(checkoutsPayload?.checkouts) ? checkoutsPayload.checkouts : [];
  const holds = !holdsResult.error && Array.isArray(holdsResult.holds) ? holdsResult.holds : [];

  const notifications = [
    ...buildCheckoutNotifications(checkouts),
    ...buildHoldNotifications(holds),
  ].sort((left, right) => severityRank(left.severity) - severityRank(right.severity));

  return NextResponse.json({
    notifications: notifications.slice(0, 6),
  });
}
