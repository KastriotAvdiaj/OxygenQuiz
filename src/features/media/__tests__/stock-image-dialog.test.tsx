import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
  apiErrorMessage: (e: { response?: { data?: { title?: string } } }) => e.response?.data?.title ?? "Something went wrong",
}));
vi.mock("@/lib/Auth", () => ({ useUser: () => ({ data: { id: "u1" } }) }));

import { StockImageDialog } from "../components/stock-image-dialog";
import { queryConfig } from "@/lib/React-query";
import { QuestionMedia } from "@/common/QuestionMedia";

const providers = (pexels: boolean) => ({
  data: [
    { id: "wikimedia", name: "Wikimedia Commons", enabled: true },
    { id: "pexels", name: "Pexels", enabled: pexels },
  ],
});

const FLAG = {
  provider: "wikimedia",
  id: "123",
  thumbUrl: "https://upload.wikimedia.org/thumb/flag.png",
  width: 800,
  height: 560,
  title: "Flag of Kosovo",
  author: "Jane",
  license: "Public domain",
};

const ASSET = {
  id: "8f7e3c1a-1111-4222-8333-444455556666",
  kind: "Image",
  url: "https://media.test/flag.webp",
  byteSize: 1000,
  credit: { provider: "Wikimedia Commons", line: "Jane · Public domain · Wikimedia Commons", sourceUrl: "https://commons.wikimedia.org/wiki/File:Flag.svg" },
};

const renderDialog = (pexels = true, searchFails?: unknown) => {
  get.mockImplementation((url: string) => {
    if (url === "/media/stock/providers") return Promise.resolve(providers(pexels));
    if (url === "/media/stock/search")
      return searchFails ? Promise.reject(searchFails) : Promise.resolve({ data: { items: [FLAG], page: 1, hasMore: false } });
    return Promise.reject(new Error(url));
  });
  const onPicked = vi.fn();
  const onOpenChange = vi.fn();
  render(
    // The app's own defaults — queries throw to the error boundary unless they opt out.
    <QueryClientProvider client={new QueryClient({ defaultOptions: { ...queryConfig, mutations: { retry: false } } })}>
      <StockImageDialog open onOpenChange={onOpenChange} onPicked={onPicked} />
    </QueryClientProvider>,
  );
  return { onPicked, onOpenChange, user: userEvent.setup() };
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe("StockImageDialog", () => {
  it("searches the chosen source and imports a result by provider and id only", async () => {
    post.mockResolvedValue({ data: ASSET });
    const { onPicked, onOpenChange, user } = renderDialog();

    await user.type(screen.getByLabelText("Search Wikimedia Commons"), "flag of kosovo");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(await screen.findByRole("button", { name: /Flag of Kosovo/ }));

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(ASSET));
    expect(get).toHaveBeenCalledWith(
      "/media/stock/search",
      expect.objectContaining({ params: { provider: "wikimedia", q: "flag of kosovo", page: 1 } }),
    );
    // Never a URL or a credit: the server looks both up itself.
    expect(post).toHaveBeenCalledWith("/media/stock/import", { provider: "wikimedia", id: "123" }, expect.anything());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers Pexels only when the site has a key for it", async () => {
    renderDialog(false);
    expect(await screen.findByLabelText("Search Wikimedia Commons")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/media/stock/providers"));
    expect(screen.queryByRole("radio", { name: "Pexels" })).not.toBeInTheDocument();
  });

  it("explains a busy source in place instead of crashing the editor", async () => {
    const { user } = renderDialog(true, {
      response: { status: 503, data: { title: "Wikimedia Commons is busy right now — try again later, or search Pexels." } },
    });

    await user.type(screen.getByLabelText("Search Wikimedia Commons"), "eiffel tower");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/busy right now/);
    expect(screen.getByLabelText("Search Wikimedia Commons")).toBeInTheDocument();
  });

  it("shows why an import was refused, and keeps the dialog open", async () => {
    post.mockRejectedValue({ response: { data: { title: "That image isn't available any more, or its licence doesn't allow reuse." } } });
    const { onPicked, onOpenChange, user } = renderDialog();

    await user.type(screen.getByLabelText("Search Wikimedia Commons"), "flag");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(await screen.findByRole("button", { name: /Flag of Kosovo/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/licence doesn't allow reuse/);
    expect(onPicked).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe("QuestionMedia credit", () => {
  it("keeps an outside image's credit behind an ⓘ until asked", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <QuestionMedia
          mediaUrl="https://media.test/flag.webp"
          mediaType="Image"
          alt="flag"
          credit={{ line: "Photo: Ana Lopez / Pexels", url: "https://www.pexels.com/photo/42/" }}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Photo: Ana Lopez / Pexels")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Image credit" }));
    expect(screen.getByRole("link", { name: "Photo: Ana Lopez / Pexels" })).toHaveAttribute("href", "https://www.pexels.com/photo/42/");
  });

  it("has no ⓘ for the author's own image", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <QuestionMedia mediaUrl="https://media.test/own.webp" mediaType="Image" alt="own" />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Image credit" })).not.toBeInTheDocument();
  });
});
