import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  api: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) },
  apiErrorMessage: (e: { response?: { data?: { title?: string } } }) => e.response?.data?.title ?? "Something went wrong",
}));

let signedIn = true;
vi.mock("@/lib/Auth", () => ({
  useUser: () => ({ data: signedIn ? { id: "u1", username: "player" } : null }),
}));

const addNotification = vi.fn();
vi.mock("@/common/Notifications", () => ({
  useNotifications: (pick: (s: { addNotification: typeof addNotification }) => unknown) => pick({ addNotification }),
}));

import { ReportButton } from "../components/report-dialog";
import { QuestionMedia } from "@/common/QuestionMedia";
import { showsPickBadge } from "../components/pick-badge";
import { editUnpicks } from "../components/picked-edit-notice";
import { CatalogueScopeSwitch, COMMUNITY_NOTICE_KEY } from "@/pages/Quiz/components/catalogue-scope-switch";

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  addNotification.mockReset();
  signedIn = true;
  window.localStorage.clear();
});

describe("ReportDialog", () => {
  it("asks for the correct answer before sending a wrong-answer report", async () => {
    post.mockResolvedValue({ data: { id: "r1" } });
    const user = userEvent.setup();
    wrap(<ReportButton questionId={7} />);

    await user.click(screen.getByRole("button", { name: "Report" }));
    await user.click(screen.getByLabelText("Wrong answer or information"));
    await user.click(screen.getByRole("button", { name: /send report/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("What's the correct answer?");
    expect(post).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("What's the correct answer?"), "Prishtina");
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/reports",
        { questionId: 7, reason: "WrongAnswer", details: "Prishtina" },
        expect.objectContaining({ skipErrorToast: true }),
      ),
    );
  });

  it("shows the API's refusal inline — already reported, own content", async () => {
    post.mockRejectedValue({ response: { data: { title: "You've already reported this." } } });
    const user = userEvent.setup();
    wrap(<ReportButton quizId={3} label="Report this quiz" />);

    await user.click(screen.getByRole("button", { name: "Report this quiz" }));
    await user.click(screen.getByLabelText("Spam or nonsense"));
    await user.click(screen.getByRole("button", { name: /send report/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You've already reported this.");
  });

  it("asks a guest to sign in instead of showing the form", async () => {
    signedIn = false;
    const user = userEvent.setup();
    wrap(<ReportButton questionId={7} />);

    await user.click(screen.getByRole("button", { name: "Report" }));

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Spam or nonsense")).not.toBeInTheDocument();
  });
});

describe("QuestionMedia under a moderation cover", () => {
  it("covers hidden media and fetches it only when a signed-in player asks", async () => {
    get.mockResolvedValue({ data: { mediaUrl: "https://media.test/x.webp", mediaType: "Image" } });
    const user = userEvent.setup();
    wrap(<QuestionMedia hidden questionId={9} mediaType="Image" alt="flag" />);

    expect(screen.getByText(/hidden — reported as inappropriate/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "flag" })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /show anyway/i }));

    expect(await screen.findByRole("img", { name: "flag" })).toHaveAttribute("src", "https://media.test/x.webp");
    expect(get).toHaveBeenCalledWith("/media/hidden/question/9", expect.anything());
  });

  it("offers a guest no way past the cover", () => {
    signedIn = false;
    wrap(<QuestionMedia hidden questionId={9} mediaType="Image" />);
    expect(screen.queryByRole("button", { name: /show anyway/i })).not.toBeInTheDocument();
  });
});

describe("Catalogue", () => {
  it("shows the community notice once, then switches straight away", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    const { unmount } = wrap(<CatalogueScopeSwitch value="picked" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Community" }));
    expect(onValueChange).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: /show community quizzes/i }));
    expect(onValueChange).toHaveBeenCalledWith("community");
    expect(window.localStorage.getItem(COMMUNITY_NOTICE_KEY)).toBe("1");
    unmount();

    onValueChange.mockReset();
    wrap(<CatalogueScopeSwitch value="picked" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("radio", { name: "Community" }));
    expect(onValueChange).toHaveBeenCalledWith("community");
  });

  it("badges a picked community quiz, never a house one", () => {
    expect(showsPickBadge({ isPicked: true, isHouse: false })).toBe(true);
    expect(showsPickBadge({ isPicked: true, isHouse: true })).toBe(false);
    expect(showsPickBadge({ isPicked: false })).toBe(false);
  });
});

describe("editUnpicks (QuizHouse.UnpickForEdit)", () => {
  it("warns an author without autopick editing a picked quiz, and no one else", () => {
    const author = { roles: ["User"], permissions: ["quiz:update:own"] };
    expect(editUnpicks({ isPicked: true }, author)).toBe(true);
    expect(editUnpicks({ isPicked: false }, author)).toBe(false);
    expect(editUnpicks({ isPicked: true }, { roles: ["User"], permissions: ["quiz:autopick"] })).toBe(false);
    expect(editUnpicks({ isPicked: true }, { roles: ["Admin"], permissions: [] })).toBe(false);
    expect(editUnpicks({ isPicked: true }, { roles: ["SuperAdmin"], permissions: [] })).toBe(false);
  });
});
