import { Fish } from "lucide-react";
import { TripForm } from "@/components/TripForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Fish className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Fishweather</h1>
          <p className="max-w-2xl text-sm text-ink-2">
            Plan your fishing day with real marine conditions, tides, nearby
            reefs &amp; structures, local fish species, and an AI-suggested best
            window.
          </p>
        </div>
      </header>
      <TripForm />
    </main>
  );
}
