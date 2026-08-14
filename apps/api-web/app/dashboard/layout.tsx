import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-session";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!session.isCommittee) redirect("/login");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">BSR Committee</div>
        <NavLink href="/dashboard/members">Member Admin</NavLink>
        <NavLink href="/dashboard/area-of-work">Area of Work</NavLink>
        <NavLink href="/dashboard/pending-upgrades">Pending Upgrades</NavLink>
        <LogoutButton />
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
