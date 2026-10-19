"use client";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <section className="p-8">
      <h1>Members are temporarily unavailable</h1>
      <button className="mt-4 rounded border px-4 py-3" onClick={retry}>
        Try again
      </button>
    </section>
  );
}
