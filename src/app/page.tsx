import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { buttonStyles } from "@/components/ui/styles";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
      <Image src={logo} alt="AutoLog" priority className="h-auto w-56" />
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
