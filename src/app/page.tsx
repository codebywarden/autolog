import Link from "next/link";
import { buttonStyles } from "@/components/ui/styles";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
        AutoLog
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Your vehicle&apos;s service history, verified against DVSA records
        and kept in one place.
      </p>
      <Link href="/login" className={buttonStyles("primary", "mt-3 w-full")}>
        Sign in
      </Link>
    </main>
  );
}
