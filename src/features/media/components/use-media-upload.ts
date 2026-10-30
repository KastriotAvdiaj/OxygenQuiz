import { useState } from "react";
import { apiErrorMessage } from "@/lib/Api-client";
import { precheckFile, useUploadMedia, type MediaAsset } from "../api/upload-media";

/**
 * Upload one chosen or dropped file: the client precheck (mirrors the API), the upload, and the
 * server's own reason when it refuses. Shared by the picker's button (a file dropped straight on it)
 * and the add-media dialog's Upload tab.
 */
export function useMediaUpload({ allowAudio, onUploaded }: { allowAudio: boolean; onUploaded: (asset: MediaAsset) => void }) {
  const upload = useUploadMedia();
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const problem = precheckFile(file, allowAudio);
    if (problem) {
      setError(problem);
      return;
    }
    upload.mutate(file, {
      onSuccess: (asset) => {
        if (!allowAudio && asset.kind !== "Image") {
          setError("Use an image here.");
          return;
        }
        onUploaded(asset);
      },
      onError: (err) => setError(apiErrorMessage(err)),
    });
  };

  return { pick, isPending: upload.isPending, error, clearError: () => setError(null) };
}
