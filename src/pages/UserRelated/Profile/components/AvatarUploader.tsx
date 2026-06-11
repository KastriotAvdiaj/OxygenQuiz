import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/common/Notifications";
import {
  useUploadAvatar,
  ALLOWED_AVATAR_TYPES,
  ALLOWED_AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
} from "../api/update-avatar";

interface AvatarUploaderProps {
  username: string;
  profileImageUrl?: string | null;
  initials: string;
}

/**
 * The signed-in user's avatar with a hover-to-change overlay. Validates type/size on the client
 * (the server re-validates and decodes the image), shows an instant local preview while uploading,
 * and refreshes the cached user on success.
 */
export const AvatarUploader = ({ username, profileImageUrl, initials }: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const addNotification = useNotifications((s) => s.addNotification);
  const upload = useUploadAvatar();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      addNotification({
        type: "error",
        title: "Unsupported image",
        message: "Please choose a JPG, PNG, or WebP image.",
      });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      addNotification({
        type: "error",
        title: "Image too large",
        message: "Your avatar must be 5 MB or smaller.",
      });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    upload.mutate(file, {
      onSuccess: () => addNotification({ type: "success", title: "Avatar updated" }),
      onError: () => setPreview(null), // the api client surfaces the error toast
      onSettled: () => URL.revokeObjectURL(localPreview),
    });
  };

  return (
    <div className="relative group h-24 w-24">
      <Avatar className="h-24 w-24 ring-1 ring-primary">
        <AvatarImage src={preview ?? profileImageUrl ?? undefined} alt={username} />
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
        aria-label="Change avatar"
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none disabled:opacity-100"
      >
        {upload.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_AVATAR_ACCEPT}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
