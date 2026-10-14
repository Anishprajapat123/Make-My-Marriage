"use client";
export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <section className="p-8">
      <h1>Events are unavailable</h1>
      <p>Please try again.</p>
      <button onClick={reset} className="mt-4 rounded border px-4 py-3">
        Retry
      </button>
    </section>
  );
}
