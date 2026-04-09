"use client";

import Link from "next/link";
import {
  BookOpen,
  Menu,
  Search,
  User,
  Filter,
  Bell,
  MessageSquare,
  Clock,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useTransition, useEffect, useRef, type ReactNode } from "react";
import { SpinningWheel, WHEEL_ITEMS } from "@/components/SpinningWheel";
import Image from "next/image";
import { LightRays } from "@/components/magicui/light-rays";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/ModeToggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { extractCallNumber, type KohaRecord } from "@/lib/koha-items";
import { searchCatalog, getBiblioCallNumber } from "@/app/dashboard/search";
import { logoutPatron, requestPasswordChangeOTP, verifyOTPAndChangePassword } from "@/actions/auth";
import { getPatronHolds, placeHold } from "@/actions/patron";
import { searchPyq } from "@/actions/pyq";
import { getBooks } from "@/lib/books-client";
import dynamic from "next/dynamic";

// Dynamically import heavy components to split JS chunks
const NewArrivals = dynamic(() => import("@/components/explore/NewArrivals").then((mod) => mod.NewArrivals));
const Gallery = dynamic(() => import("@/components/explore/Gallery").then((mod) => mod.Gallery));
const Locations = dynamic(() => import("@/components/explore/Locations").then((mod) => mod.Locations));
const Feedback = dynamic(() => import("@/components/explore/Feedback").then((mod) => mod.Feedback));

// --- CHILD COMPONENTS FOR MAIN VIEW ---

const MY_BOOKS_SECTION_ID = "my-books-section";

type CheckoutRecord = {
  checkout_id: number;
  due_date: string;
  renewals_count?: number;
  title?: string;
  author?: string;
  callnumber?: string;
  call_number?: string;
  item?: (KohaRecord & {
    title?: string;
    author?: string;
    biblio?: KohaRecord & {
      title?: string;
      author?: string;
    };
  });
  biblio?: KohaRecord & {
    title?: string;
    author?: string;
  };
} & KohaRecord;

type SearchResult = {
  biblio_id?: number | string;
  title?: string;
  author?: string;
  publication_year?: number | string;
  isbn?: string;
  series?: string;
  item_type?: string;
  publisher?: string;
  place?: string;
  description?: string;
  notes?: string;
  abstract?: string;
  callnumber?: string;
  call_number?: string;
  url?: string;
};

type HoldRecord = {
  hold_id?: number | string;
  reserve_id?: number | string;
  biblio_id?: number | string;
  item_id?: number | string;
  title?: string;
  author?: string;
  status?: string;
  found?: string;
  hold_date?: string;
  waiting_date?: string;
  expiration_date?: string;
  pickup_date?: string;
  pickup_library_id?: string;
  item?: (KohaRecord & {
    title?: string;
    author?: string;
    biblio?: KohaRecord & {
      title?: string;
      author?: string;
    };
  });
  biblio?: KohaRecord & {
    title?: string;
    author?: string;
  };
} & KohaRecord;

type NotificationRecord = {
  id: string;
  type: 'overdue' | 'due_soon' | 'hold_ready' | 'fine';
  message: string;
  severity: 'high' | 'medium' | 'info';
};

function resolveCheckoutCallNumber(checkout: CheckoutRecord): string | null {
  return (
    checkout.callnumber ||
    checkout.call_number ||
    extractCallNumber(checkout.item) ||
    extractCallNumber(checkout) ||
    null
  );
}

async function fetchPatronCheckouts(): Promise<CheckoutRecord[]> {
  const response = await fetch("/api/patrons/checkouts", { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Unable to load your checked out books.");
  }

  return Array.isArray(payload?.checkouts) ? payload.checkouts : [];
}

function formatDisplayDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString();
}

function resolveHoldTitle(hold: HoldRecord): string {
  return hold.item?.biblio?.title || hold.biblio?.title || hold.item?.title || hold.title || "Unknown Title";
}

function resolveHoldAuthor(hold: HoldRecord): string {
  return hold.item?.biblio?.author || hold.biblio?.author || hold.item?.author || hold.author || "";
}

function resolveHoldStatus(hold: HoldRecord): string {
  if (hold.found === "W") return "Ready for pickup";
  if (hold.found === "T") return "In transit";

  if (typeof hold.status === "string" && hold.status.trim()) {
    const normalized = hold.status.replace(/_/g, " ").trim();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  if (typeof hold.found === "string" && hold.found.trim()) {
    return hold.found;
  }

  return "Pending";
}

function isHoldReady(hold: HoldRecord): boolean {
  return hold.found === "W" || resolveHoldStatus(hold).toLowerCase().includes("ready");
}

function CallNumberDisplay({ biblioId, initialCallNumber }: { biblioId?: number | string, initialCallNumber?: string }) {
  const [callNumber, setCallNumber] = useState<string | null>(initialCallNumber || null);
  const [isLoading, setIsLoading] = useState(false);

  if (callNumber) {
    return <p className="text-xs text-muted-foreground mt-1">Call No: {callNumber}</p>;
  }

  if (!biblioId) return null;

  return (
    <div className="mt-1">
      {isLoading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Loading call number...</p>
      ) : (
        <button 
          onClick={async () => {
            setIsLoading(true);
            try {
              const cn = await getBiblioCallNumber(biblioId);
              setCallNumber(cn || 'Not available');
            } catch (e) {
              setCallNumber('Error loading');
            } finally {
              setIsLoading(false);
            }
          }}
          className="text-xs text-blue-500 hover:underline"
        >
          Show Call Number
        </button>
      )}
    </div>
  );
}

function NewArrivalsGrid() {
  const [books, setBooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getBooks()
      .then((cleanBooks) => setBooks(cleanBooks))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (books.length === 0) return <div className="flex h-32 items-center justify-center text-muted-foreground">No new arrivals found.</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
      {books.map((src, idx) => (
        <div key={idx} className="group relative aspect-[2/3] overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md">
          <Image src={src} alt={`Book ${idx + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 33vw" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm" className="translate-y-4 group-hover:translate-y-0 transition-transform">
              View Details
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardView({
  profile,
  refreshKey,
  isMyBooksOpen,
  onCloseMyBooks,
  onOpenMyBooks,
  onShowToast,
}: {
  profile: {name: string, email: string, initials: string, library_id?: string | null} | null;
  refreshKey: number;
  isMyBooksOpen?: boolean;
  onCloseMyBooks?: () => void;
  onOpenMyBooks?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}) {
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [holds, setHolds] = useState<HoldRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [holdsError, setHoldsError] = useState<string | null>(null);
  const [renewingIds, setRenewingIds] = useState<Set<number>>(new Set());
  const [isMyHoldsOpen, setIsMyHoldsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!profile) {
      setCheckouts([]);
      setHolds([]);
      setNotifications([]);
      setLoadError(null);
      setHoldsError(null);
      setLoading(false);
      return;
    }

    const loadPatronActivity = async () => {
      setLoading(true);
      setLoadError(null);
      setHoldsError(null);

      const [checkoutsResult, holdsResult] = await Promise.allSettled([
        fetchPatronCheckouts(),
        getPatronHolds()
      ]);

      if (cancelled) {
        return;
      }

      let currentCheckouts: CheckoutRecord[] = [];
      let currentHolds: HoldRecord[] = [];

      if (checkoutsResult.status === "fulfilled") {
        currentCheckouts = checkoutsResult.value;
        setCheckouts(currentCheckouts);
      } else {
        setCheckouts([]);
        setLoadError(
          checkoutsResult.reason instanceof Error
            ? checkoutsResult.reason.message
            : "Unable to load your checked out books."
        );
      }

      if (holdsResult.status === "fulfilled") {
        if (holdsResult.value.error) {
          setHolds([]);
          setHoldsError(holdsResult.value.error);
        } else {
          currentHolds = holdsResult.value.holds as HoldRecord[];
          setHolds(currentHolds);
        }
      } else {
        setHolds([]);
        setHoldsError("Unable to load your holds.");
      }

      // --- Generate Notifications Instantly ---
      const newNotifications: NotificationRecord[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      currentCheckouts.forEach(checkout => {
        if (!checkout.due_date || !checkout.checkout_id) return;
        const dueDate = new Date(checkout.due_date);
        if (Number.isNaN(dueDate.getTime())) return;
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
        const title = checkout.item?.biblio?.title || checkout.biblio?.title || checkout.item?.title || checkout.title || "Unknown Title";
        
        if (daysUntilDue < 0) {
          newNotifications.push({ id: `overdue-${checkout.checkout_id}`, type: "overdue", severity: "high", message: `"${title}" is overdue. Please renew or return it.` });
        } else if (daysUntilDue <= 3) {
          newNotifications.push({ id: `due-soon-${checkout.checkout_id}`, type: "due_soon", severity: daysUntilDue === 0 ? "high" : "medium", message: `"${title}" is due on ${dueDate.toLocaleDateString()}.` });
        }
      });

      currentHolds.forEach(hold => {
        if (isHoldReady(hold)) {
          const title = resolveHoldTitle(hold);
          const location = hold.pickup_library_id ? ` at ${hold.pickup_library_id}` : "";
          newNotifications.push({
            id: `hold-ready-${hold.hold_id || hold.reserve_id || hold.biblio_id || hold.item_id || title}`, type: "hold_ready", severity: "info", message: `"${title}" is ready for pickup${location}.`
          });
        }
      });

      newNotifications.sort((a, b) => {
        const rank = { high: 0, medium: 1, info: 2 };
        return rank[a.severity] - rank[b.severity];
      });

      setNotifications(newNotifications.slice(0, 6));

      setLoading(false);
    };

    void loadPatronActivity();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, profile]);

  const handleRenew = async (checkoutId: number) => {
    if (renewingIds.has(checkoutId)) return;
    setRenewingIds((prev) => new Set(prev).add(checkoutId));
    
    try {
      setLoadError(null);

      const res = await fetch("/api/patrons/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkout_id: checkoutId })
      });

      const payload = await res.json().catch(() => null);

      if (res.ok) {
        const refreshedCheckouts = await fetchPatronCheckouts();
        setCheckouts(refreshedCheckouts);
        onShowToast?.("Book renewed successfully!", "success");
      } else {
        onShowToast?.(`Renewal failed: ${payload?.error || "Book might have reached its renewal limit or has a hold."}`, "error");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Unable to refresh your books right now. Please try again.");
    } finally {
      setRenewingIds((prev) => {
        const next = new Set(prev);
        next.delete(checkoutId);
        return next;
      });
    }
  };

  const renderCheckoutRecord = (checkout: CheckoutRecord) => {
    // Fallbacks to handle Koha's embedding behavior accurately
    const title = checkout.item?.biblio?.title || checkout.biblio?.title || checkout.item?.title || checkout.title || "Unknown Title";
    const author = checkout.item?.biblio?.author || checkout.biblio?.author || checkout.item?.author || checkout.author || "";
    const callNumber = resolveCheckoutCallNumber(checkout);
    const dueDate = new Date(checkout.due_date).toLocaleDateString();
    const isOverdue = new Date(checkout.due_date) < new Date();
    const renewalsCount = checkout.renewals_count || 0;

    return (
      <div key={checkout.checkout_id} className="flex items-center justify-between border-b pb-2 pt-1.5 last:border-0 last:pb-0 first:pt-0">
        <div className="flex-1 mr-2">
          <p className="text-sm font-medium line-clamp-1 leading-tight" title={title}>{title}</p>
          {author && <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">{author}</p>}
          {callNumber && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mt-0.5" title={callNumber}>
              Call No: {callNumber}
            </p>
          )}
          <p className={`text-[11px] mt-0.5 leading-tight ${isOverdue ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            Due: {dueDate} <span className="ml-1 text-muted-foreground font-normal">(Renewed: {renewalsCount}x)</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'text-red-500' : 'text-green-500'}`} />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-5 text-[10px] px-2 py-0" 
            disabled={renewingIds.has(checkout.checkout_id)} 
            onClick={() => handleRenew(checkout.checkout_id)}
          >
            {renewingIds.has(checkout.checkout_id) ? "Renewing..." : "Renew"}
          </Button>
        </div>
      </div>
    );
  };

  const renderHoldRecord = (hold: HoldRecord, index: number) => {
    const title = resolveHoldTitle(hold);
    const author = resolveHoldAuthor(hold);
    const status = resolveHoldStatus(hold);
    const statusDate = isHoldReady(hold)
      ? formatDisplayDate(hold.expiration_date) || formatDisplayDate(hold.waiting_date)
      : formatDisplayDate(hold.hold_date) || formatDisplayDate(hold.waiting_date);
    const statusLabel = isHoldReady(hold)
      ? statusDate
        ? `Pickup until ${statusDate}`
        : hold.pickup_library_id
          ? `Ready at ${hold.pickup_library_id}`
          : "Awaiting pickup"
      : statusDate
        ? `Placed ${statusDate}`
        : hold.pickup_library_id
          ? `Pickup at ${hold.pickup_library_id}`
          : "Processing";

    return (
      <div
        key={String(hold.hold_id || hold.reserve_id || hold.biblio_id || hold.item_id || index)}
        className="flex items-start justify-between gap-3 border-b pb-1.5 pt-1 last:border-0 last:pb-0 first:pt-0"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-1 leading-tight" title={title}>{title}</p>
          {author && <p className="text-[11px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">{author}</p>}
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{statusLabel}</p>
        </div>
        <Badge variant={isHoldReady(hold) ? "default" : "secondary"} className="shrink-0">
          {status}
        </Badge>
      </div>
    );
  };

  const readyHoldsCount = holds.filter(isHoldReady).length;

  return (
    <div className="h-[calc(100%-2rem)] my-4 overflow-y-auto pl-2 custom-scrollbar" style={{ direction: "rtl" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" style={{ direction: "ltr" }}>
        <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ask Me</div>
            <p className="text-xs text-muted-foreground mt-1">
              &ldquo;Where is the shelf for Operating Systems?&rdquo;
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Checking alerts...</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-3 text-muted-foreground">
                <CheckCircle className="h-6 w-6 mb-2 opacity-50" />
                <span className="text-xs">You're all caught up!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-2 border-b pb-2 last:border-0 last:pb-0">
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${notif.severity === 'high' ? 'bg-red-500' : notif.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <p className={`text-xs leading-tight ${notif.severity === 'high' ? 'text-red-500 font-medium' : notif.severity === 'medium' ? 'text-amber-600' : 'text-foreground'}`}>
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <div id={MY_BOOKS_SECTION_ID}>
          <Card className="hover:shadow-md transition-all md:col-span-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Your Books</CardTitle>
              <button onClick={onOpenMyBooks} className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer" title="View all books">
                <BookOpen className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!profile ? (
                <p className="text-xs text-muted-foreground">Please log in to view your checked out books.</p>
              ) : loading ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading checkouts...</p>
              ) : loadError ? (
                <p className="text-xs text-destructive">{loadError}</p>
              ) : checkouts.length === 0 ? (
                <p className="text-xs text-muted-foreground">You have no books currently checked out.</p>
              ) : (
                <div className="flex flex-col">
                  <div className="flex flex-col">
                    {checkouts.slice(0, 2).map(renderCheckoutRecord)}
                  </div>
                  {checkouts.length > 2 && (
                    <button onClick={onOpenMyBooks} className="text-[11px] text-blue-500 hover:underline mt-1 py-0.5 w-full text-center">
                      + {checkouts.length - 2} more
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Holds</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {!profile ? (
              <p className="text-xs text-muted-foreground">Please log in to view your holds.</p>
            ) : loading ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading holds...</p>
            ) : holdsError ? (
              <p className="text-xs text-destructive">{holdsError}</p>
            ) : holds.length === 0 ? (
              <p className="text-xs text-muted-foreground">You have no active holds.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] leading-tight text-muted-foreground">
                  <span>{holds.length} active hold(s)</span>
                  <span>{readyHoldsCount} ready for pickup</span>
                </div>
                <div className="flex flex-col">
                  {holds.slice(0, 2).map(renderHoldRecord)}
                </div>
                {holds.length > 2 && (
                  <button
                    onClick={() => setIsMyHoldsOpen(true)}
                    className="text-[11px] text-blue-500 hover:underline mt-0.5 py-0.5 w-full text-center"
                  >
                    + {holds.length - 2} more hold(s)
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isMyBooksOpen && (
        <div onClick={onCloseMyBooks} className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 cursor-pointer" style={{ direction: "ltr" }}>
          <button
            onClick={onCloseMyBooks}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl h-[80vh] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl bg-card flex flex-col cursor-auto">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-2xl font-bold tracking-tight">My Checked Out Books</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You have {checkouts.length} book(s) currently checked out.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {checkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have no books currently checked out.</p>
              ) : (
                checkouts.map(renderCheckoutRecord)
              )}
            </div>
          </div>
        </div>
      )}

      {isMyHoldsOpen && (
        <div onClick={() => setIsMyHoldsOpen(false)} className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 cursor-pointer" style={{ direction: "ltr" }}>
          <button
            onClick={() => setIsMyHoldsOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl h-[80vh] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl bg-card flex flex-col cursor-auto">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-2xl font-bold tracking-tight">My Holds</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You have {holds.length} active hold(s).
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {holds.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have no active holds.</p>
              ) : (
                holds.map(renderHoldRecord)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PyqView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{
    title: string;
    directory: string;
    relativePath: string;
    extension: string;
    url: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    if (!query.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }
    setError(null);
    startSearchTransition(async () => {
      try {
        const res = await searchPyq(query);
        setResults(res.results);
        setTotalMatches(res.totalMatches);
      } catch {
        setError("An error occurred while searching for papers.");
        setResults([]);
        setTotalMatches(0);
      }
    });
  };

  return (
    <div className="h-[calc(100%-2rem)] my-4 overflow-y-auto pl-2 custom-scrollbar" style={{ direction: "rtl" }}>
      <div className="space-y-4 mb-8" style={{ direction: "ltr" }}>
        <h2 className="text-2xl font-bold tracking-tight">Previous Year Question Papers</h2>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search question papers by department, year, or subject..." 
              className="pl-9 h-10 w-full" 
              disabled={isSearching}
            />
          </div>
          <Button type="submit" disabled={isSearching} className="w-28">
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </form>

        {error && <p className="text-destructive">{error}</p>}
        {!isSearching && hasSearched && totalMatches > 0 && (
          <p className="text-sm text-muted-foreground">
            Found {totalMatches} paper{totalMatches === 1 ? "" : "s"}
            {totalMatches > results.length ? `, showing the top ${results.length}.` : "."}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {isSearching ? <p className="text-muted-foreground col-span-full animate-pulse">Searching...</p> :
            hasSearched && results.length === 0 ? <p className="text-muted-foreground col-span-full">No papers found for &quot;{query}&quot;.</p> :
            results.map((result) => {
              return (
                <a key={result.relativePath} href={result.url} download target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium line-clamp-2" title={result.title}>{result.title}</p>
                      {result.directory && (
                        <p className="text-xs text-muted-foreground line-clamp-3" title={result.directory}>
                          {result.directory}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

function RulesView() {
  return (
    <div className="h-full rounded-2xl border bg-muted/30 backdrop-blur-sm overflow-hidden flex flex-col relative">
      <LightRays speed={5} />
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar my-4 relative z-10" style={{ direction: "rtl" }}>
        <div className="max-w-4xl mx-auto space-y-6" style={{ direction: "ltr" }}>
          <h1 className="text-3xl font-bold text-center mb-8">KRC Rules & Regulations</h1>

          <Card>
            <CardHeader>
              <CardTitle>General Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>KRC is open throughout the year except for Sundays and University Holidays from 8.00 to 20.00 Hours and Saturday from 8.00 to 18.30 hours.</li>
                <li>University I Card is mandatory to visit the KRC. The same will be treated as membership card.</li>
                <li>KRC is a Silent Zone. Students must maintain silence all the time.</li>
                <li>Keep mobile sets on silent mode when you are in the KRC premises.</li>
                <li>Eatables are strictly prohibited.</li>
                <li>Users can avail Reprography Facility on payment basis.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membership Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>All students, faculty members and staff of MITWPU are members of KRC.</li>
                <li>The tenure of student’s membership is valid only up to the completion of the course.</li>
                <li>The membership is also provided to MITWPU Alumni on payment basis.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Circulation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Students are permitted to borrow five books for the period of fifteen days.</li>
                <li>For renewals, books have to physically present to KRC and renewal is allowed if no reservations/claim against those books.</li>
                <li>Reference books, bound volumes, journals are not lent out of the KRC.</li>
                <li>Books in damaged condition will not be accepted from the reader.</li>
                <li>Loss of books should be immediately reported to the Librarian. The member shall either replace the books of same edition or pay the cost of the book as per current market price.</li>
                <li>Borrowing facility can be withdrawn in case of any kind of misbehavior.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digital Library Rules</CardTitle>
            </CardHeader>
            <CardContent>
                <h3 className="font-semibold mb-2">Guidelines for Fair Use of e-Resources</h3>
                <p className="mb-4 text-muted-foreground">Access to and use of electronic resources and online content is restricted to authorized users within the University premises. The users are responsible for using these resources for academic & noncommercial use only.</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Electronic resources includes e-journals, e-databases, e-books and open access material.</li>
                <li>These resources can be browsed, may be downloaded and used as per publisher’s policy. Downloading or printing of a complete book or an entire issue or a volume of one or more journals (called systematic downloading) is strictly prohibited.</li>
                <li>Any violation of this policy will result in penal action and block to the entire community of users at university from accessing those particular resources.</li>
                <li>KRC subscribes E-Resources directly through the publishers and authorized vendors as per eSS Consortium. The terms and conditions for using these resources are indicated in electronic resource license agreements with each publisher. It is the responsibility of individual users to ensure that the use of these resources does not breach the terms and conditions specified in the license agreements.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TeamView() {
  const teamMembers = [
    {
      name: "DR. Praveenkumar Vaidya",
      role: "Librarian",
      imageSrc: "/Praveenkumar-Vaidya-librarian-KRC.webp",
    },
    { name: "Dhumal Vandana", role: "Assistant Librarian"},
    { name: "Salunkhe Amol", role: "Sr. Executive - Library" },
    { name: "Team Member 4", role: "Librarian" },
    { name: "Team Member 5", role: "Librarian" },
    { name: "Team Member 6", role: "Librarian" },
  ];

  return (
    <div className="h-[calc(100%-2rem)] my-4 overflow-y-auto pl-2 custom-scrollbar" style={{ direction: "rtl" }}>
      <div className="space-y-3 mb-6" style={{ direction: "ltr" }}>
        <h2 className="text-2xl font-bold tracking-tight">Our Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {teamMembers.map((member) => (
            <Card key={member.name} className="overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-[5/4.5] relative bg-muted flex items-center justify-center">
                {member.imageSrc ? (
                  <Image
                    src={member.imageSrc}
                    alt={member.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="text-sm font-semibold leading-tight">{member.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

type MainView = 'dashboard' | 'rules' | 'team' | 'pyq';

const OPEN_ATHENS_URL = "https://accounts.google.com/v3/signin/accountchooser?continue=https%3A%2F%2Faccounts.google.com%2Fo%2Fsaml2%2Fcontinue%3Fidpid%3DC02rclpgk%26SAMLRequest%3DnZJBb9swDIX%2FiqC7LUuOXUeIE2QJigXotqBxd9hNlhhHmCx5ktxu%2F35OsgDdpSh64I18fOT3FqvfvUHP4IN2tsY0zTACK53StqvxU3OfVBiFKKwSxlmosXV4tVwE0ZuBr8d4so%2Fwa4QQ0ToE8HFS2Tgbxh78AfyzlvD0%252BFDjU4xD4IQY12mbugGsiCewIbUQyVmMMCJkIL2OL8OYghpTbYkRRM3ZvKKlSihTWTJrRZ5UszxP1LGA9k4UVJZHjLaTAT1JXm647RJSutHGkHbOdQZS6XriLssY0WpYTaVVvcmYl2bofmJ077yEy001PgoTAKPdtsZQ5qqoyjbLoZ0VFOaUVVUpK1XdFWcTU1cII%252Bzs%252BU2xxixjZZKxhOYNo5wxTrN0OuEHRnvvopPOfNL2%252Bt%2FRW%252B5E0IFb0UPgUfLD%252BssDZ2nG22tT4J%252BbZp%2Fsvx0ajL7fOLEzp4mcDfyC4m2p4d9efAXHL379q%2Fm3x8WNLF6%252Bh2MPUSgRRRKGj%2FFckFcub1n7OtnabffOaPkHrY1xLxsPIk6JpJgsryP%2FJ3L5Fw%253D%253D%26RelayState%3D%2Fsaml%2F2%2Fsso%2Fmitwpu.edu.in%2Fo%2F81752106%2Fc%2Foafed%3FSAMLRequest%253DfZJbT8MwDIX%25252FSpT3NW02donWocGEmMRl2goPvKWpxyK1dqlTYP%25252BebmMSPMCzfY7t73h6%25252BVmV4h0a9oSpTKJYCkBHhcfXVD5lN72xFBwsFrYkhFQiycvZlG1V1mbehh2u4a0FDmLODE3oXK4Jua2g2UDz7h08re9SuQuhZqNUtY%25252BoBrRhB8gRQlAHJ6WVdSzFovPxXfG4yllS0qvHP1TMpCofPuo2gqKNPCpS42R0oZN4qJwiu4VCiuUilTAsBoNR3s%25252Fz7Xhw4SYW8m2hcz1yBfRzyLsu5haWeLg1pFLHetiLdS%25252FpZzoxWpt4Ek3G%25252BkWKVUOBHJVXHk%25252BQ2gYNWfZs0FbAJjizmd%25252FfGR3FJj81sbnNslVv9bjJpHg%25252Bw9YH2B1%25252BZHPk%25252Bb9V%25252FT1Xnuib477ND%25252F3%25252FcnuOR87%25252BDoOsAgw%25252B7Kfqx4xz3A%25252Bd6XKxotK7vZiXJX1cN2BD9xSJVLOT5PdTzL4A%2526RelayState%253D%25252Fapp%25252Fresearch%26omethod%3DGET&faa=1&flowName=GlifWebSignIn&flowEntry=AccountChooser&dsh=S941534151%3A1771017731635255";

function Navbar({
  profile,
  onSelectView,
  onShowMyBooks,
  onShowPassword,
}: {
  profile: {name: string, email: string, initials: string, library_id?: string | null} | null;
  onSelectView: (view: MainView) => void;
  onShowMyBooks: () => void;
  onShowPassword: () => void;
}) {
  const navItems = [
    { name: "Home", view: "dashboard" as MainView },
    { name: "Rules", view: "rules" as MainView },
    { name: "Our Team", view: "team" as MainView },
    { name: "P.Y.Q", view: "pyq" as MainView },
    { name: "E-Resources", href: "/resources" },
    { name: "Book Rooms", href: "/rooms" },
  ];

  return (
    <nav className="relative w-full h-24 border-b bg-background/5">
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="size-full"
          squareSize={4}
          gridGap={6}
          color="#9CA3AF"
          maxOpacity={0.2}
          flickerChance={0.1}
          height={96}
          width={2000}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90" />
      </div>

      <div className="container relative z-10 h-full flex items-start px-4">
        <div className="flex self-center mr-4">
          <div className="md:hidden mr-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) =>
                    item.href ? (
                      <Link key={item.name} href={item.href} className="text-lg font-medium">
                        {item.name}
                      </Link>
                    ) : (
                      <button key={item.name} onClick={() => onSelectView(item.view!)} className="text-lg font-medium text-left">
                        {item.name}
                      </button>
                    )
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link
            href="/"
            className="relative h-12 w-48 transition-opacity hover:opacity-80"
          >
            <Image
              src="/mit-logo.avif"
              alt="MIT-WPU Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center gap-1 rounded-b-2xl rounded-t-none border-x border-b border-t-0 bg-background/60 backdrop-blur-xl px-6 py-4 shadow-sm mt-[-1px]">
            {navItems.map((item) => {
              if (item.name === "E-Resources") {
                return (
                  <NavigationMenu key={item.name}>
                    <NavigationMenuList>
                      <NavigationMenuItem>
                        <NavigationMenuTrigger className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all bg-transparent h-auto w-auto data-[state=open]:bg-muted/50 data-[active]:bg-muted/50 focus:bg-muted/50">
                          {item.name}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-[200px] p-2">
                            <li>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={OPEN_ATHENS_URL}
                                  target="_blank"
                                  className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                  <div className="text-sm font-medium leading-none">Open Athens</div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
                );
              }
              return item.href ? (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all"
                >
                  {item.name}
                </Link>
              ) : (
                <button
                  key={item.name}
                  onClick={() => onSelectView(item.view!)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-all"
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 self-center">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src="" alt={profile?.name || "Profile"} />
                  <AvatarFallback>{profile?.initials || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile ? profile.name : "Loading..."}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile ? profile.email : "..."}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShowMyBooks}>My Books</DropdownMenuItem>
              <DropdownMenuItem onClick={onShowPassword}>Change Password</DropdownMenuItem>
              <DropdownMenuItem>My Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutPatron()} className="cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

// --- MAIN DASHBOARD SHELL ---
export function DashboardInteractiveShell({
  profile,
  rulesView,
  teamView
}: {
  profile: {name: string, email: string, initials: string, library_id?: string | null} | null;
  rulesView: ReactNode;
  teamView: ReactNode;
}) {
  const [activeSection, setActiveSection] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [checkoutRefreshKey, setCheckoutRefreshKey] = useState(0);
  const [isMyBooksOpen, setIsMyBooksOpen] = useState(false);
  const [isNewArrivalsOpen, setIsNewArrivalsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [confirmPasswordVal, setConfirmPasswordVal] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOTPStep, setIsOTPStep] = useState(false);
  const [otpVal, setOtpVal] = useState("");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("catalog");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [holdingIds, setHoldingIds] = useState<Set<string | number>>(new Set());

  // Toast state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError(null);

    startTransition(async () => {
      const res = await searchCatalog(searchQuery, searchFilter);
      if (res?.error) {
        setSearchError(res.error);
        setSearchResults(null);
      } else {
        setSearchResults(res?.results || []);
      }
    });
  };

  const handlePlaceHold = async (biblioId?: number | string) => {
    if (!biblioId) return;
    if (holdingIds.has(biblioId)) return;
    setHoldingIds((prev) => new Set(prev).add(biblioId));

    try {
      const res = await placeHold(Number(biblioId));
      if (res.error) {
        showToast(`Hold failed: ${res.error}`, "error");
      } else {
        setCheckoutRefreshKey((current) => current + 1);
        showToast('Hold placed successfully!', "success");
      }
    } catch (err) {
      showToast('An unexpected error occurred while placing the hold.', "error");
    } finally {
      setHoldingIds((prev) => {
        const next = new Set(prev);
        next.delete(biblioId);
        return next;
      });
    }
  };

  const handleInternalNavigation = (view: MainView) => {
    setMainView(view);
    setSearchResults(null);
  };

  const handleMyBooksNavigation = () => {
    handleInternalNavigation("dashboard");
    setCheckoutRefreshKey((current) => current + 1);
    setIsMyBooksOpen(true);
  };

  const handleOpenFeedback = () => {
    handleInternalNavigation("dashboard");
    setActiveSection(3);
  };

  const handleRequestOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await requestPasswordChangeOTP(formData);
      if (res.error) {
        showToast(res.error, "error");
      } else if (res.requiresOTP) {
        showToast(res.message || "Verification code sent!", "success");
        setIsOTPStep(true);
      }
    } catch (err) {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleVerifyOTP = async (formData?: FormData) => {
    setIsChangingPassword(true);
    
    // If triggered by auto-submit, construct formData manually
    const data = formData || new FormData();
    if (!formData) {
      data.append("otp", otpVal);
      data.append("newPassword", newPasswordVal);
    }

    try {
      const res = await verifyOTPAndChangePassword(data);
      if (res.error) {
        showToast(res.error, "error");
        setOtpVal(""); // Clear OTP so they can try again
      } else {
        showToast(res.message || "Password updated successfully!", "success");
        closePasswordModal();
      }
    } catch (err) {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Auto-submit when all 6 OTP digits are entered
  useEffect(() => {
    if (isOTPStep && otpVal.length === 6 && !isChangingPassword) {
      handleVerifyOTP();
    }
  }, [otpVal, isOTPStep, isChangingPassword]);

  const closePasswordModal = () => {
    if (isChangingPassword) return;
    setIsPasswordOpen(false);
    setNewPasswordVal("");
    setConfirmPasswordVal("");
    setOtpVal("");
    setIsOTPStep(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const renderExploreContent = () => {
    switch (activeSection) {
      case 0: return <NewArrivals onImageClick={() => setIsNewArrivalsOpen(true)} />;
      case 1: return <Gallery />;
      case 2: return <Locations />;
      case 3: return <Feedback />;
      default: return <NewArrivals onImageClick={() => setIsNewArrivalsOpen(true)} />;
    }
  };
  
  const renderMainContent = () => {
    switch (mainView) {
      case "rules":
        return rulesView;
      case "team":
        return teamView;
      case "pyq":
        return <PyqView />;
      default:
        return (
          <DashboardView 
            profile={profile}
            refreshKey={checkoutRefreshKey} 
            isMyBooksOpen={isMyBooksOpen}
            onCloseMyBooks={() => setIsMyBooksOpen(false)}
            onOpenMyBooks={() => setIsMyBooksOpen(true)}
            onShowToast={showToast}
          />
        );
    }
  };

  const activeItem = WHEEL_ITEMS[activeSection];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #52525b;
          border-radius: 10px;
        }
      `}} />
      <Navbar 
        profile={profile} 
        onSelectView={handleInternalNavigation} 
        onShowMyBooks={handleMyBooksNavigation} 
        onShowPassword={() => setIsPasswordOpen(true)} 
      />

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 overflow-hidden">
        {/* LEFT SECTION (Dynamic Content) */}
        <div className="flex-1 flex flex-col gap-8">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col gap-2 mt-[2vh]">
            <div className="flex gap-2">
              <div className="hidden sm:block w-44">
                <Select value={searchFilter} onValueChange={setSearchFilter} disabled={isPending}>
                  <SelectTrigger className="h-10 bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Search by..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" sideOffset={0} className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="catalog">Library catalog</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="seriestitle">Series</SelectItem>
                    <SelectItem value="isbn">ISBN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog..." 
                  className="pl-9 h-10 w-full" 
                  disabled={isPending}
                />
              </div>
              <Button type="submit" size="icon" disabled={isPending}>
                <Search className={`h-4 w-4 ${isPending ? "animate-pulse" : ""}`} />
              </Button>
            </div>
            {searchError && <span className="text-sm text-destructive px-2">{searchError}</span>}
          </form>

          <div className="flex-1 min-h-0">
            {searchResults ? (
              <div className="h-[calc(100%-2rem)] my-4 overflow-y-auto pl-2 custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Search Results</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)}>
                    Clear Results
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/10 rounded-xl border border-dashed">
                      <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No results found for &quot;{searchQuery}&quot;</h3>
                      <div className="text-sm text-muted-foreground text-left max-w-md mt-4 space-y-3">
                        <p>The library search engine is sensitive to exact matches. Please try the following:</p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Try correcting any spelling mistakes in your search.</li>
                          <li>Search for the exact title name or author name.</li>
                          <li>If you are having trouble locating a book in the online catalog, kindly visit the library counter at Agyastya for further enquiry about the book&apos;s availability.</li>
                          <li>
                            If nothing is able to resolve your issue, please submit a{" "}
                            <button
                              type="button"
                              onClick={handleOpenFeedback}
                              className="font-medium text-blue-500 hover:underline"
                            >
                              feedback
                            </button>
                            .
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    searchResults.map((biblio, i) => (
                      <Card key={biblio.biblio_id || i} className="hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base line-clamp-2">{biblio.title || "Untitled"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Author: {biblio.author || "N/A"}</p>
                          {biblio.publication_year && <p className="text-xs text-muted-foreground mt-1">Year: {biblio.publication_year}</p>}
                          {biblio.isbn && <p className="text-xs text-muted-foreground mt-1">ISBN: {biblio.isbn}</p>}
                          {biblio.series && <p className="text-xs text-muted-foreground mt-1">Series: {biblio.series}</p>}
                          <CallNumberDisplay
                            biblioId={biblio.biblio_id}
                            initialCallNumber={biblio.callnumber || biblio.call_number}
                          />
                          {biblio.item_type && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Type: <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{biblio.item_type}</Badge></p>
                          )}
                          {(biblio.publisher || biblio.place) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Published: {biblio.place ? `${biblio.place} : ` : ''}{biblio.publisher}
                            </p>
                          )}
                          {biblio.description && <p className="text-xs text-muted-foreground mt-1">Description: {biblio.description}</p>}
                          {biblio.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={biblio.notes}>Notes: {biblio.notes}</p>}
                          {biblio.abstract && <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={biblio.abstract}>Summary: {biblio.abstract}</p>}
                          {biblio.url && <a href={biblio.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block w-fit">Online Resource</a>}
                          <div className="mt-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs px-3" 
                              disabled={!!biblio.biblio_id && holdingIds.has(biblio.biblio_id)} 
                              onClick={() => handlePlaceHold(biblio.biblio_id)}
                            >
                              {biblio.biblio_id && holdingIds.has(biblio.biblio_id) ? "Placing..." : "Place Hold"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : renderMainContent()}
          </div>
        </div>

        {/* RIGHT SECTION (Wheel) */}
        <div className="w-full lg:w-96 flex flex-col gap-6 overflow-hidden">
          <div className="hidden lg:flex flex-col h-[calc(100%_-_2vh)] mt-[2vh] gap-4">
            <div className="h-[45%] flex flex-col">
              <div
                className={`flex items-center gap-2 text-sm font-bold tracking-widest mb-3 uppercase transition-colors duration-300 ${activeItem.color}`}
              >
                <activeItem.icon className="h-4 w-4" />
                {activeItem.label}
              </div>
              <div className="flex-1 relative rounded-2xl border bg-background/40 backdrop-blur-xl p-1 sm:p-2 shadow-sm ring-1 ring-border/50">
                <div className="h-full w-full rounded-xl bg-background/40">
                  {renderExploreContent()}
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center pb-4">
              <SpinningWheel
                activeId={activeSection}
                onIdChange={setActiveSection}
                onOpenGallery={() => setIsGalleryOpen(true)}
                onOpenNewArrivals={() => setIsNewArrivalsOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>

      {isGalleryOpen && (
        <div onClick={() => setIsGalleryOpen(false)} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300 cursor-pointer">
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl cursor-auto">
            <Gallery />
          </div>
        </div>
      )}

      {isNewArrivalsOpen && (
        <div onClick={() => setIsNewArrivalsOpen(false)} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 cursor-pointer">
          <button
            onClick={() => setIsNewArrivalsOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl bg-card flex flex-col cursor-auto">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-2xl font-bold tracking-tight">New Arrivals</h2>
              <p className="text-sm text-muted-foreground mt-1">Just added to the collection</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <NewArrivalsGrid />
            </div>
          </div>
        </div>
      )}

      {isPasswordOpen && (
        <div onClick={closePasswordModal} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 cursor-pointer">
          <button
            onClick={closePasswordModal}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition text-white border border-white/10"
            disabled={isChangingPassword}
          >
            <X className="h-6 w-6" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl bg-card flex flex-col cursor-auto p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Change Password</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isOTPStep ? "Enter the 6-digit verification code sent to your email." : "Update your library account password."}
            </p>
            
            <form onSubmit={isOTPStep ? (e) => { e.preventDefault(); handleVerifyOTP(new FormData(e.currentTarget)); } : handleRequestOTP} className="space-y-4">
              <div className={isOTPStep ? "hidden" : "space-y-4"}>
                <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <Input name="currentPassword" type={showCurrentPassword ? "text" : "password"} required disabled={isChangingPassword} className="pr-10" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input name="newPassword" type={showNewPassword ? "text" : "password"} required minLength={8} disabled={isChangingPassword} className="pr-10" value={newPasswordVal} onChange={e => setNewPasswordVal(e.target.value)} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Must be at least 8 characters long with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  {confirmPasswordVal && newPasswordVal !== confirmPasswordVal && (
                    <span className="text-[10px] text-destructive font-medium">Passwords do not match</span>
                  )}
                </div>
                <div className="relative">
                  <Input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required minLength={8} disabled={isChangingPassword} className="pr-10" value={confirmPasswordVal} onChange={e => setConfirmPasswordVal(e.target.value)} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              </div>

              {isOTPStep && (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300 relative py-4">
                  <div className="flex justify-center gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`w-12 h-14 border rounded-md flex items-center justify-center text-2xl font-semibold shadow-sm transition-all ${otpVal.length === i ? 'border-primary ring-1 ring-primary' : 'border-input bg-muted/20'}`}>
                        {otpVal[i] || ""}
                      </div>
                    ))}
                  </div>
                  {/* Hidden Input handles native mobile keyboard/pasting behavior beautifully */}
                  <input name="otp" type="text" maxLength={6} required={isOTPStep} value={otpVal} onChange={e => setOtpVal(e.target.value.replace(/[^0-9]/g, ''))} className="absolute inset-0 w-full h-full opacity-0 cursor-text" disabled={isChangingPassword} autoFocus />
                  <p className="text-xs text-muted-foreground text-center mt-2">Check your official university email inbox.</p>
                </div>
              )}

              <Button type="submit" className={`w-full mt-4 ${isOTPStep && "hidden"}`} disabled={isChangingPassword || (!isOTPStep && !!confirmPasswordVal && newPasswordVal !== confirmPasswordVal) || (isOTPStep && otpVal.length !== 6)}>
                {isChangingPassword ? "Processing..." : "Send Verification Code"}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-[11px] text-muted-foreground leading-tight text-center">
                <span className="font-semibold text-foreground">Note:</span> Kindly save your new password to ensure smooth access to your account. Contact Admin in case you're locked out of your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-xl border text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 backdrop-blur-md ${
          toast.type === 'success' 
            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
            : 'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
