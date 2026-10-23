import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/Api-client", () => ({
  api: { post: (...args: unknown[]) => post(...args) },
  apiErrorMessage: (e: { response?: { data?: { title?: string } } }) => e.response?.data?.title ?? "Upload failed",
}));

import { MediaPicker } from "../components/media-picker";
import { MediaCreditLine } from "../components/media-credit";
import { precheckFile } from "../api/upload-media";

const ASSET = "8f7e3c1a-1111-4222-8333-444455556666";

const renderPicker = (props: Partial<React.ComponentProps<typeof MediaPicker>> = {}) => {
  const onChange = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MediaPicker value={null} onChange={onChange} {...props} />
    </QueryClientProvider>,
  );
  return { onChange, user: userEvent.setup({ applyAccept: false }) };
};

const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;

// Braced: a function *returned* from beforeEach is a teardown hook, and mockReset returns the mock
// — Vitest would call post() after each test.
beforeEach(() => {
  post.mockReset();
});

describe("precheckFile", () => {
  it("refuses what the API would refuse, before sending it", () => {
    expect(precheckFile(new File(["x"], "a.gif", { type: "image/gif" }), true)).toMatch(/JPEG, PNG or WebP/);
    expect(precheckFile(new File(["x"], "a.svg", { type: "image/svg+xml" }), true)).not.toBeNull();
    expect(precheckFile(new File(["x"], "a.mp3", { type: "audio/mpeg" }), false)).toMatch(/image/);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect(precheckFile(big, true)).toMatch(/10 MB/);
    expect(precheckFile(new File(["x"], "ok.png", { type: "image/png" }), true)).toBeNull();
    expect(precheckFile(new File(["x"], "clip.m4a", { type: "" }), true)).toBeNull();
  });
});

describe("MediaPicker", () => {
  it("uploads the chosen file and hands the form an asset id, never a bare URL", async () => {
    post.mockResolvedValue({ data: { id: ASSET, kind: "Image", url: "https://media.test/i.webp", byteSize: 10 } });
    const { onChange, user } = renderPicker();

    await user.upload(input(), new File(["x"], "flag.png", { type: "image/png" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ assetId: ASSET, url: "https://media.test/i.webp", kind: "Image", credit: null }),
    );
    expect(post).toHaveBeenCalledWith("/media", expect.any(FormData), expect.objectContaining({ skipErrorToast: true }));
  });

  it("shows the server's reason beside itself when the upload is refused", async () => {
    post.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 400"), {
        response: { status: 400, data: { title: "That image is too large in pixels." } },
      }),
    );
    const { onChange, user } = renderPicker();

    await user.upload(input(), new File(["x"], "huge.png", { type: "image/png" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That image is too large in pixels.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses a file type up front without a request", async () => {
    const { onChange, user } = renderPicker();
    await user.upload(input(), new File(["x"], "doc.pdf", { type: "application/pdf" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a cover picker takes images only", async () => {
    const { user } = renderPicker({ allowAudio: false });
    await user.upload(input(), new File(["x"], "clip.mp3", { type: "audio/mpeg" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/image/i);
    expect(post).not.toHaveBeenCalled();
  });

  it("previews what's attached and removes it", async () => {
    const { onChange, user } = renderPicker({
      value: { assetId: ASSET, url: "https://media.test/c.mp3", kind: "Audio" },
    });

    expect(screen.getByLabelText("Attached audio clip")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove clip/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("MediaCreditLine", () => {
  it("credits the author and the provider, linking out without a referrer", () => {
    render(
      <MediaCreditLine
        credit={{ provider: "Pexels", author: "Jane Doe", authorUrl: "https://pexels.com/@jane", sourceUrl: "https://pexels.com/photo/1" }}
      />,
    );

    expect(screen.getByText(/Photo:/)).toHaveTextContent("Photo: Jane Doe / Pexels");
    const author = screen.getByRole("link", { name: "Jane Doe" });
    expect(author).toHaveAttribute("href", "https://pexels.com/@jane");
    expect(author).toHaveAttribute("rel", "noopener noreferrer");
  });
});
