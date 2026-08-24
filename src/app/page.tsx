import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">AutoLog</h1>
      <p className="text-sm text-neutral-600">
        Your vehicle&apos;s service history, in one place.
      </p>
      <Link
        href="/login"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Sign in
      </Link>
    </main>
  );
}
