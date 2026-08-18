"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "./Icons";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      className="sidebar-signout"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <IconLogout />
      <span className="sidebar-signout-label">
        Sign out
        <span className="sidebar-signout-sub">{label}</span>
      </span>
    </button>
  );
}
