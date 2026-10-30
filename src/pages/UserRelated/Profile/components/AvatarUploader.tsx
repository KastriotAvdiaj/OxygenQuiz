import { useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditPencil } from "@/components/icons/edit-pencil";
import { useNotifications } from "@/common/Notifications";
import {
  useUploadAvatar,
  ALLOWED_AVATAR_TYPES,
  ALLOWED_AVATAR_ACCEPT,
  MAX_AVATAR_SOURCE_BYTES,
} from "../api/update-avatar";
import { cropAvatar } from "../lib/crop-avatar";
import { AvatarCropDialog } from "./AvatarCropDialog";

interface AvatarUploaderProps {
  username: string;
  profileImageUrl?: string | null;
  initials: string;
}

/**
 * The signed-in user's avatar with a hover-to-change overlay and a pencil badge (the badge is what
 * tells a touch screen, which has no hover, that the avatar can be changed). Picking a photo opens
 * `AvatarCropDialog`; only the cropped 512×512 square is uploaded. Validates type on the client (the
 * server re-validates and decodes the image), shows the cropped result as an instant preview while
 * uploading, and refreshes the cached user on success.
 */
export const AvatarUploader = ({ username, profileImageUrl, initials }: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const addNotification = useNotifications((s) => s.addNotification);
  const upload = useUploadAvatar();
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  const closeCropper = () => {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  };

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
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      addNotification({
        type: "error",
        title: "Image too large",
        message: "Please choose a photo of 20 MB or less.",
      });
      return;
    }

    setSource(URL.createObjectURL(file));
  };

  const handleApply = async (area: Area, rotation: number) => {
    if (!source) return;
    setCropping(true);
    let cropped: File;
    try {
      cropped = await cropAvatar(source, area, rotation);
    } catch (error) {
      addNotification({
        type: "error",
        title: "Couldn't crop the image",
        message: error instanceof Error ? error.message : "Please try another photo.",
      });
      setCropping(false);
      return;
    }

    const localPreview = URL.createObjectURL(cropped);
    upload.mutate(cropped, {
      onSuccess: () => {
        setPreview(localPreview);
        closeCropper();
        addNotification({ type: "success", title: "Avatar updated" });
      },
      // The api client surfaces the error toast; the dialog stays open so they can retry.
      onError: () => URL.revokeObjectURL(localPreview),
      onSettled: () => setCropping(false),
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

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground"
      >
        <EditPencil size={14} />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_AVATAR_ACCEPT}
        className="hidden"
        onChange={handleFile}
      />

      {source && (
        <AvatarCropDialog
          key={source}
          src={source}
          saving={cropping}
          onApply={handleApply}
          onCancel={closeCropper}
        />
      )}
    </div>
  );
};
