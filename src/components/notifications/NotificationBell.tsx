"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    fetch("/api/notifications?unread=true").then(r => r.ok ? r.json() : null).then(j => { if (j) setUnread(j.items?.length || j.unreadCount || 0); }).catch(() => {});
  }, []);
  return (
    <Link href="/notifications" className="h-9 w-9 grid place-items-center rounded-full border bg-white relative" aria-label={`${unread} unread notifications`}>
      <Bell className="h-4 w-4 text-midnight" />
      {unread > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-plum text-white text-[10px] grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
