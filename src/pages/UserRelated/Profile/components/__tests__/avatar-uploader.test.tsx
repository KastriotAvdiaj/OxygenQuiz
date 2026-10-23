import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
vi.mock("../../api/update-avatar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/update-avatar")>()),
  useUploadAvatar: () => ({ mutate, isPending: false }),
}));
const addNotification = vi.fn();
vi.mock("@/common/Notifications", () => ({
  useNotifications: (select: (s: { addNotification: typeof addNotification }) => unknown) =>
    select({ addNotification }),
}));

import { AvatarUploader } from "../AvatarUploader";

beforeAll(() => {
  // jsdom implements neither; the cropper measures its box and the picker makes an object URL.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  mutate.mockClear();
  addNotification.mockClear();
});

const pick = async (file: File) => {
  const user = userEvent.setup({ applyAccept: false });
  render(<AvatarUploader username="kaloti" profileImageUrl={null} initials="K" />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);
  return user;
};

describe("AvatarUploader", () => {
  it("opens the crop dialog instead of uploading the picked photo", async () => {
    await pick(new File(["x"], "me.png", { type: "image/png" }));

    expect(await screen.findByRole("dialog", { name: "Edit image" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Zoom" })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("uploads nothing when the crop is cancelled", async () => {
    const user = await pick(new File(["x"], "me.png", { type: "image/png" }));
    await screen.findByRole("dialog", { name: "Edit image" });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mutate).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });

  it("rejects a file type the server won't take, without opening the dialog", async () => {
    await pick(new File(["x"], "me.gif", { type: "image/gif" }));

    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", title: "Unsupported image" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
