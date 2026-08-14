"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname?.startsWith(href);
  return (
    <Link href={href} className={`sidebar-link${active ? " active" : ""}`}>
      {children}
    </Link>
  );
}
