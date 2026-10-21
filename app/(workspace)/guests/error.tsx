"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main style={{ padding: 32 }}>
      <h1>Guests are temporarily unavailable</h1>
      <p>Please try again.</p>
      <button onClick={retry}>Try again</button>
    </main>
  );
}
