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

import { AddMediaDialog } from "../components/add-media-dialog";
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
      <AddMediaDialog open allowAudio onOpenChange={onOpenChange} onPicked={onPicked} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  return { onPicked, onOpenChange, user, openSearch: async () => {
    await user.click(screen.getByRole("radio", { name: /search images/i }));
    await screen.findByLabelText("Search free images"); // the panels cross-fade
  } };
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe("AddMediaDialog — the two sources", () => {
  it("opens on Upload, and only asks for the image sources once Search is chosen", async () => {
    const { user, openSearch } = renderDialog();
    expect(screen.getByRole("radio", { name: /upload/i })).toBeChecked();
    expect(screen.getByLabelText("Choose an image or audio clip")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();

    await openSearch();
    expect(await screen.findByLabelText("Search free images")).toBeInTheDocument();
    void user;
  });

  it("uploads a file from the device and hands back the asset", async () => {
    post.mockResolvedValue({ data: ASSET });
    const { onPicked, onOpenChange, user } = renderDialog();

    await user.upload(screen.getByLabelText("Choose an image or audio clip"), new File(["x"], "flag.png", { type: "image/png" }));

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(ASSET));
    expect(post).toHaveBeenCalledWith("/media", expect.any(FormData), expect.objectContaining({ skipErrorToast: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("AddMediaDialog — Search images", () => {
  it("searches the chosen source and imports a result by provider and id only", async () => {
    post.mockResolvedValue({ data: ASSET });
    const { onPicked, onOpenChange, user, openSearch } = renderDialog();

    await openSearch();
    await user.type(screen.getByLabelText("Search free images"), "flag of kosovo");
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

  it("searching doesn't submit the form the picker sits in", async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve(url === "/media/stock/providers" ? providers(true) : { data: { items: [FLAG], page: 1, hasMore: false } }),
    );
    const outerSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { ...queryConfig } })}>
        {/* The quiz builder: the picker, and so this dialog, live inside its <form>. */}
        <form onSubmit={outerSubmit}>
          <AddMediaDialog open allowAudio onOpenChange={vi.fn()} onPicked={vi.fn()} />
        </form>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("radio", { name: /search images/i }));
    await user.type(await screen.findByLabelText("Search free images"), "flag");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("button", { name: /Flag of Kosovo/ });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it("offers the photo source only when the site has a key for it, and names no source", async () => {
    const { openSearch } = renderDialog(false);
    await openSearch();
    expect(await screen.findByLabelText("Search free images")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/media/stock/providers"));
    expect(screen.queryByRole("radio", { name: "Photos" })).not.toBeInTheDocument();
  });

  it("explains a busy source in place instead of crashing the editor", async () => {
    const { user, openSearch } = renderDialog(true, {
      response: { status: 503, data: { title: "Wikimedia Commons is busy right now — try again later, or search Pexels." } },
    });

    await openSearch();
    await user.type(screen.getByLabelText("Search free images"), "eiffel tower");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/busy right now/);
    expect(screen.getByLabelText("Search free images")).toBeInTheDocument();
  });

  it("shows why an import was refused, and keeps the dialog open", async () => {
    post.mockRejectedValue({ response: { data: { title: "That image isn't available any more, or its licence doesn't allow reuse." } } });
    const { onPicked, onOpenChange, user, openSearch } = renderDialog();

    await openSearch();
    await user.type(screen.getByLabelText("Search free images"), "flag");
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
