import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { TasksScreen } from "@/modules/tasks/components/tasks-screen";
import { TaskForm } from "@/modules/tasks/components/task-form";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/layout/sign-out-button", () => ({
  SignOutButton: () => <button>Sign out</button>,
}));
const props = {
  timezone: "Asia/Kolkata",
  weddingTitle: "QA wedding",
  memberName: "QA member",
  roleLabel: "FAMILY_MEMBER",
  memberId: "222222222222222222222222",
  canManage: false,
  canUpdateAssigned: true,
};
const empty = {
  tasks: [],
  total: 0,
  page: 1,
  pageSize: 25,
  counts: { total: 0, todo: 0, inProgress: 0, completed: 0, overdue: 0 },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows loading then an assigned empty state without planner controls", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ success: true, data: empty })),
  );
  render(<TasksScreen {...props} />);
  expect(screen.getByRole("status").textContent).toContain("Loading");
  await screen.findByText("Room for your next small step");
  expect(screen.queryByRole("link", { name: "Create task" })).toBeNull();
  expect(screen.queryByLabelText("Assignee")).toBeNull();
});
it("recovers from fetch failure using Retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { success: false, error: { message: "QA outage" } },
          { status: 503 },
        ),
      )
      .mockResolvedValue(Response.json({ success: true, data: empty })),
  );
  render(<TasksScreen {...props} />);
  await screen.findByText("QA outage");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Room for your next small step");
});
it("does not show a task form to assigned-only members", () => {
  render(<TaskForm {...props} />);
  expect(screen.getByText("Planning access required")).toBeTruthy();
  expect(screen.queryByLabelText("Task title")).toBeNull();
});
it("preserves selected status and collapsed optional fields when submitting", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ success: true, data: { events: [], members: [] } }),
    )
    .mockResolvedValue(
      Response.json(
        { success: false, error: { message: "QA save failure" } },
        { status: 503 },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(<TaskForm {...props} canManage />);
  await screen.findByLabelText("Task title");
  fireEvent.change(screen.getByLabelText("Task title"), {
    target: { value: "Flowers" },
  });
  fireEvent.change(screen.getByLabelText("Status", { exact: true }), {
    target: { value: "WAITING" },
  });
  fireEvent.change(screen.getByLabelText("Deadline date"), {
    target: { value: "2026-12-01" },
  });
  fireEvent.change(screen.getByLabelText("Deadline time"), {
    target: { value: "18:30" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create task" }));
  await screen.findByText("QA save failure");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(sent.status).toBe("WAITING");
  expect(sent.dueAt).toBe("2026-12-01T13:00:00.000Z");
  expect(sent.assigneeMemberIds).toEqual([]);
});
