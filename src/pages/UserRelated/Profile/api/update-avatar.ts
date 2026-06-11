import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";

// Mirrors the server's avatar validation so we can reject obviously-bad files before uploading.
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_AVATAR_ACCEPT = ALLOWED_AVATAR_TYPES.join(",");
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

/** POSTs the new avatar and returns the stored absolute URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await api.post("/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return (response.data as { profileImageUrl: string }).profileImageUrl;
}

/**
 * Uploads a new avatar and refreshes the signed-in user so the new picture shows everywhere it's
 * rendered (profile, header, drawer) — they all read the ["authenticated-user"] query.
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authenticated-user"] });
    },
  });
};
