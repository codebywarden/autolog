"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface DvsaMotTestSummary {
  testResult: "PASSED" | "FAILED" | string;
  expiryDate: string | null;
}

interface DvsaVehicleSummary {
  registration: string;
  make: string | null;
  model: string | null;
  primaryColour: string | null;
  fuelType: string | null;
  engineSize: string | null;
  motTests: DvsaMotTestSummary[];
}

type Step = "search" | "preview" | "saving";

export default function AddVehiclePage() {
  const router = useRouter();
  const [vrm, setVrm] = useState("");
  const [step, setStep] = useState<Step>("search");
  const [vehicle, setVehicle] = useState<DvsaVehicleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/vehicles/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vrm }),
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.detail ?? body.error ?? "Lookup failed");
      return;
    }

    setVehicle(body.data as DvsaVehicleSummary);
    setStep("preview");
  }

  async function handleConfirm() {
    setStep("saving");
    setError(null);

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vrm }),
      });

      let body: { error?: string } = {};
      try {
        body = await response.json();
      } catch {
        // Response wasn't JSON (e.g. a platform error page) — fall
        // through to the generic error below rather than throwing.
      }

      if (!response.ok) {
        setError(body.error ?? `Failed to add vehicle (${response.status})`);
        setStep("preview");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add vehicle");
      setStep("preview");
    }
  }

  const latestTest = vehicle?.motTests?.[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Add a vehicle</h1>

      {step === "search" && (
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            value={vrm}
            onChange={(event) => setVrm(event.target.value)}
            placeholder="AB12CDE"
            required
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Look up"}
          </button>
        </form>
      )}

      {(step === "preview" || step === "saving") && vehicle && (
        <div className="flex flex-col gap-4">
          <div className="rounded border border-neutral-300 p-4 text-sm">
            <p className="text-lg font-semibold">{vehicle.registration}</p>
            <p>{[vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
            <p className="text-neutral-600">
              {[
                vehicle.primaryColour,
                vehicle.fuelType,
                vehicle.engineSize && `${vehicle.engineSize}cc`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {latestTest ? (
              <p className="mt-2">
                Latest MOT:{" "}
                <strong>
                  {latestTest.testResult === "PASSED" ? "Pass" : "Fail"}
                </strong>
                {latestTest.expiryDate && ` · expires ${latestTest.expiryDate}`}
              </p>
            ) : (
              <p className="mt-2 text-neutral-600">
                No MOT history found — likely a newer vehicle.
              </p>
            )}
            <p className="mt-1 text-neutral-500">
              {vehicle.motTests.length} MOT test(s) on record
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setStep("search");
                setVehicle(null);
              }}
              disabled={step === "saving"}
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Search again
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === "saving"}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {step === "saving" ? "Adding…" : "Add to AutoLog"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
