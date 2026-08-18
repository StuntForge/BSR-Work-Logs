import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-session";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { IconUsers, IconTrendingUp, IconSettings, IconInbox, IconShield } from "./Icons";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!session.isCommittee) redirect("/login");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <Logo />
          </div>

          <nav className="sidebar-nav">
            <NavLink href="/dashboard/users" icon={<IconUsers />}>
              Users
            </NavLink>
            <NavLink href="/dashboard/pending-upgrades" icon={<IconTrendingUp />}>
              Pending Upgrades
            </NavLink>
            <NavLink href="/dashboard/support-tickets" icon={<IconInbox />}>
              Support Tickets
            </NavLink>
            <NavLink href="/dashboard/known-issues" icon={<IconShield />}>
              Known Issues
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-banner" />

        <div className="sidebar-footer">
          <NavLink href="/dashboard/settings" icon={<IconSettings />}>
            Settings
          </NavLink>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
