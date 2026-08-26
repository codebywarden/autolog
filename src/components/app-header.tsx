"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logo from "@/assets/logo.png";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/dashboard", label: "Your vehicles" },
  { href: "/dashboard/vehicles/add", label: "Add a vehicle" },
  { href: "/dashboard/vehicles/receive", label: "Receive a vehicle" },
  { href: "/dashboard/garage", label: "Garage portal" },
  { href: "/dashboard/resources", label: "Resources" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={() => setOpen(false)}
        >
          <Image src={logo} alt="AutoLog" className="h-8 w-auto" priority />
        </Link>

        <button
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-background"
        >
          {open ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 bg-foreground/10"
          />
          <nav className="absolute right-4 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-md">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleSignOut}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-critical hover:bg-critical-bg"
            >
              Sign out
            </button>
          </nav>
        </>
      )}
    </header>
  );
}
