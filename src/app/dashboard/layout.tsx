import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
