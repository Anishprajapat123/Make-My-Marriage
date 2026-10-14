import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EventsScreen } from "@/modules/events/components/events-screen";
import { EventForm } from "@/modules/events/components/event-form";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/layout/sign-out-button", () => ({
  SignOutButton: () => <button>Sign out</button>,
}));
const props = {
  timezone: "Asia/Kolkata",
  weddingTitle: "Test wedding",
  memberName: "Test member",
  roleLabel: "VIEWER",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Events UI states", () => {
  it.each([false, true])(
    "preserves Published on default submit; explicit draft=%s",
    async (draft) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { success: false, error: { message: "Test response" } },
            { status: 503 },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);
      const { container } = render(<EventForm {...props} />);
      for (const [label, value] of [
        ["Event name *", "Sangeet"],
        ["Start date *", "2026-11-26"],
        ["Start time *", "19:30"],
        ["Venue name *", "Ballroom"],
        ["Address *", "Main Road"],
        ["City *", "Jaipur"],
      ])
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      fireEvent.change(screen.getByLabelText("Event status *"), {
        target: { value: "PUBLISHED" },
      });
      // Browsers activate the first submit button for implicit Enter submission.
      const defaultButton = container.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )!;
      expect(defaultButton.textContent).toBe("Publish event");
      fireEvent.click(
        draft
          ? screen.getByRole("button", { name: "Save as draft" })
          : defaultButton,
      );
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe(
        draft ? "DRAFT" : "PUBLISHED",
      );
      await screen.findByText("Test response");
    },
  );
  it("does not offer creation in the read-only empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ success: true, data: { events: [] } }),
        ),
    );
    render(<EventsScreen {...props} canManage={false} />);
    await screen.findByText("No events scheduled yet");
    expect(screen.queryByRole("link", { name: /Create.*event/i })).toBeNull();
    expect(
      screen.getByText("A wedding organizer can add events to this workspace."),
    ).toBeTruthy();
  });
  it("can recover from a failed list fetch without losing the screen", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(
        Response.json({ success: true, data: { events: [] } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<EventsScreen {...props} canManage />);
    await screen.findByText("Offline");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("No events scheduled yet");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("preserves the entered event when saving fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { success: false, error: { message: "Service unavailable" } },
            { status: 503 },
          ),
        ),
    );
    const { container } = render(<EventForm {...props} />);
    for (const [label, value] of [
      ["Event name *", "Sangeet"],
      ["Start date *", "2026-11-26"],
      ["Start time *", "19:30"],
      ["Venue name *", "Ballroom"],
      ["Address *", "Main Road"],
      ["City *", "Jaipur"],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Service unavailable"),
    );
    expect(
      (screen.getByLabelText("Event name *") as HTMLInputElement).value,
    ).toBe("Sangeet");
    expect(
      (screen.getByLabelText("Venue name *") as HTMLInputElement).value,
    ).toBe("Ballroom");
    expect(
      (screen.getByRole("button", { name: "Save event" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
