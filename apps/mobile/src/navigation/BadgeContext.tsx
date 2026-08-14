import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface BadgeContextValue {
  unreadNotifications: number;
  pendingApprovals: number;
  refresh: () => void;
}

const BadgeContext = createContext<BadgeContextValue>({ unreadNotifications: 0, pendingApprovals: 0, refresh: () => {} });

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadNotifications, setUnread] = useState(0);
  const [pendingApprovals, setPending] = useState(0);

  const refresh = useCallback(() => {
    if (!user) return;
    apiFetch<{ unreadCount: number }>("/api/notifications").then((d) => setUnread(d.unreadCount)).catch(() => {});
    if (user.isFullMember) {
      apiFetch<{ pending: unknown[] }>("/api/work-approvals").then((d) => setPending(d.pending.length)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return <BadgeContext.Provider value={{ unreadNotifications, pendingApprovals, refresh }}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  return useContext(BadgeContext);
}
