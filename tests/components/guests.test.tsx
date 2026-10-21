import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
vi.mock("@/components/layout/workspace-shell", () => ({
  WorkspaceShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
import { GuestsScreen } from "@/modules/guests/components/guests-screen";
const family = (id: string, name: string) => ({
  id,
  name,
  side: "OTHER",
  notes: "",
  revision: 0,
  primaryContactGuestId: null,
  primaryContactName: null,
  activeCount: 0,
  archivedCount: 0,
});
const groups = [
  family("111111111111111111111111", "Household One"),
  family("222222222222222222222222", "Household Two"),
];
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => ({
      ok: true,
      json: async () => ({
        success: true,
        data: input.startsWith("/api/v1/families")
          ? { families: groups, total: 2, page: 1, limit: 25 }
          : {
              guests: [],
              total: 0,
              page: 1,
              limit: 25,
              counts: { active: 0, archived: 0, families: 2, ungrouped: 0 },
            },
      }),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = {
  canView: true,
  canManage: true,
  weddingTitle: "QA",
  memberName: "QA",
  roleLabel: "Owner",
};
describe("guest UI review regressions", () => {
  it("does not get stuck loading when the current tab is clicked", async () => {
    render(<GuestsScreen {...props} />);
    await screen.findByRole("heading", { name: "Make room for your people" });
    fireEvent.click(screen.getByRole("button", { name: "Guest ledger" }));
    await waitFor(() =>
      expect(screen.queryByText("Loading your guests…")).toBeNull(),
    );
    expect(
      screen.getByRole("heading", { name: "Make room for your people" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Family households" }));
    await screen.findByRole("heading", { name: "Household One" });
    fireEvent.click(screen.getByRole("button", { name: "Family households" }));
    await waitFor(() =>
      expect(screen.queryByText("Loading your families…")).toBeNull(),
    );
  });
  it("resets the draft and selected family when Add person targets another household", async () => {
    render(<GuestsScreen {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Family households" }));
    const first = await screen.findByRole("heading", { name: "Household One" });
    const second = screen.getByRole("heading", { name: "Household Two" });
    fireEvent.click(
      within(first.closest("article")!).getByRole("button", {
        name: "Add person",
      }),
    );
    fireEvent.change(screen.getByLabelText("Guest name"), {
      target: { value: "Unsaved guest" },
    });
    expect(screen.getByText("Family: Household One")).toBeTruthy();
    fireEvent.click(
      within(second.closest("article")!).getByRole("button", {
        name: "Add person",
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Guest name") as HTMLInputElement).value,
      ).toBe(""),
    );
    expect(screen.getByText("Family: Household Two")).toBeTruthy();
  });
});
