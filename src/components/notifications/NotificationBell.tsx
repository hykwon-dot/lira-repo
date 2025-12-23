"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { useUserStore } from "@/lib/userStore";
import type { NotificationDTO, NotificationListResponse } from "@/types/notification";

const POLL_INTERVAL_MS = 20000;

function formatRelativeTime(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return "";
  }
  const diffMs = Date.now() - value.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s 전`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return value.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function getBadgeColor(type: NotificationDTO["type"]) {
  switch (type) {
    case "INVESTIGATION_ASSIGNED":
      return "bg-indigo-100 text-indigo-600";
    case "CHAT_MESSAGE":
      return "bg-emerald-100 text-emerald-600";
    case "INVESTIGATION_STATUS":
      return "bg-amber-100 text-amber-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function NotificationBell() {
  const token = useUserStore((state) => state.token);
  const user = useUserStore((state) => state.user);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadIds = useMemo(() => notifications.filter((item) => !item.readAt).map((item) => item.id), [notifications]);

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (!token || typeof window === "undefined") return;
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=12`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("Failed to fetch notifications", res.status, res.statusText);
        return;
      }
      const data = (await res.json()) as NotificationListResponse;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Notification fetch error:", error);
      // 에러 발생 시 빈 상태로 설정
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [token]);

  const markAsRead = useCallback(async (ids?: number[]) => {
    if (!token || typeof window === "undefined") return;
    const body: Record<string, unknown> = {};
    if (ids && ids.length > 0) {
      body.ids = ids;
    } else {
      body.markAll = true;
    }
    setMarking(true);
    try {
      const res = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("Failed to mark notifications", res.status, res.statusText);
        return;
      }
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) =>
          ids && ids.length > 0 ? (ids.includes(item.id) ? { ...item, readAt: nowIso } : item) : { ...item, readAt: item.readAt ?? nowIso },
        ),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark as read error:", error);
    } finally {
      setMarking(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void fetchNotifications(true);
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
    }
    pollingRef.current = window.setInterval(() => {
      void fetchNotifications(false);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!open || unreadIds.length === 0) {
      return;
    }
    void markAsRead(unreadIds);
  }, [open, unreadIds, markAsRead]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!token || !user) {
    return null;
  }

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
        aria-label="알림 열기"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">알림</p>
              <p className="text-xs text-slate-400">최근 업데이트 {notifications.length}건</p>
            </div>
            <button
              type="button"
              onClick={() => markAsRead()}
              disabled={marking || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> 전체 읽음
            </button>
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">표시할 알림이 없습니다.</p>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.readAt;
                const href = item.actionUrl ?? "/";
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className={`flex gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 ${
                      isUnread ? "bg-indigo-50/60" : "bg-white"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span
                      className={`mt-1 inline-flex min-w-[32px] items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${getBadgeColor(
                        item.type,
                      )}`}
                    >
                      {item.type.replace(/_/g, " ")}
                    </span>
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="font-semibold text-slate-800">{item.title}</span>
                      {item.message && <span className="text-xs text-slate-500 line-clamp-2">{item.message}</span>}
                      <span className="text-[11px] text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
