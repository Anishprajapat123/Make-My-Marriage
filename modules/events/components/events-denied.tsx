import { WorkspaceShell } from "@/components/layout/workspace-shell";
import Link from "next/link";
export function EventsDenied() {
  return (
    <WorkspaceShell activePage="Events">
      <section style={{ padding: 32 }}>
        <h1>Events access restricted</h1>
        <p>
          Your role cannot open this event view. Ask your wedding owner for the
          appropriate access.
        </p>
        <Link href="/events">Event schedule</Link>
        <p>
          <a href="/dashboard">Back to dashboard</a>
        </p>
      </section>
    </WorkspaceShell>
  );
}
