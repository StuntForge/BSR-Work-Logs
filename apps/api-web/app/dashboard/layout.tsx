import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server-session";
import { NavLink } from "./NavLink";
import { LogoutButton } from "./LogoutButton";
import { Logo } from "./Logo";
import { IconUsers, IconTrendingUp, IconSettings, IconLetter, IconBug, IconShield, IconClipboardList } from "./Icons";

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
            <NavLink href="/dashboard/support-tickets" icon={<IconLetter />}>
              Support Tickets
            </NavLink>
            <NavLink href="/dashboard/known-issues" icon={<IconBug />}>
              Known Issues
            </NavLink>
            <NavLink href="/dashboard/audit-logs" icon={<IconClipboardList />}>
              Audit Logs
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-banner" />

        <div className="sidebar-footer">
          {session.isAdmin && (
            <NavLink href="/dashboard/committee-users" icon={<IconShield />}>
              Committee Users
            </NavLink>
          )}
          <NavLink href="/dashboard/settings" icon={<IconSettings />}>
            Settings
          </NavLink>
          <LogoutButton label={session.isAdmin ? "Administrator" : session.name} />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
