"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getIdToken, withIdTokenHeader } from "@/app/lib/id_token";

const navLinks = [
  { href: "/page/browse", label: "Browse" },
  { href: "/page/my_listings", label: "My Listings" },
  { href: "/page/applications", label: "My Applications" },
];

type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  message: string;
  listing_id?: string;
  application_id?: string;
  read: boolean;
  created_at: unknown;
};

function formatDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const ts = value as { seconds: number };
    return new Date(ts.seconds * 1000).toLocaleDateString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return "";
}

export default function Navbar() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    const idToken = getIdToken();
    if (!idToken) return;

    setLoading(true);
    try {
      const res = await fetch(
        "/api/notifications",
        withIdTokenHeader({ method: "GET", cache: "no-store" }, idToken)
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    const idToken = getIdToken();
    if (!idToken || ids.length === 0) return;

    try {
      await fetch(
        "/api/notifications",
        withIdTokenHeader(
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationIds: ids }),
          },
          idToken
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Don't show navbar on login/signup pages
  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  const handleLogout = () => {
    document.cookie = "idToken=; path=/; max-age=0";
    document.cookie = "id_token=; path=/; max-age=0";
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("idToken");
    }
    window.location.href = "/login";
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    // Mark all as read when opening
    if (!showDropdown) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        void markAsRead(unreadIds);
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/page/browse"
          className="font-[family-name:var(--font-league-spartan)] text-xl font-bold tracking-tight text-zinc-900 dark:text-white"
        >
          Bloom
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Notifications Bell */}
          <div className="relative ml-2">
            <button
              type="button"
              onClick={handleBellClick}
              className="relative rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  {loading && notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-zinc-500">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-zinc-500">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 ${
                            n.read
                              ? "bg-white dark:bg-zinc-900"
                              : "bg-blue-50/50 dark:bg-blue-950/20"
                          }`}
                        >
                          <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            {n.title}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {n.message}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                            <span>{formatDate(n.created_at)}</span>
                            {n.listing_id && (
                              <Link
                                href={`/page/listing/${n.listing_id}`}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                                onClick={() => setShowDropdown(false)}
                              >
                                View listing
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="ml-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
