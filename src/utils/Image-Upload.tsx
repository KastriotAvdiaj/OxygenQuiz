import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/Api-client";

/**
 * Interface for ImageUpload component props
 */
interface ImageUploadProps {
  /** Callback function when image is successfully uploaded */
  onUpload: (url: string) => void;
  /** Callback function when image is removed */
  onRemove?: () => void;
  /** Optional disable state for the upload input */
  disabled?: boolean;
  /** Optional class name for additional styling */
  className?: string;
  /** Optional endpoint path - defaults to "ImageUpload/question" */
  endpoint?: string;
  /** Optional initial image URL to display preview */
  initialImageUrl?: string | null;
}

/**
 * Component for uploading images with preview and remove functionality
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  onRemove,
  disabled = false,
  className = "",
  endpoint = "ImageUpload/question",
  initialImageUrl = null,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialImageUrl);
  const [error, setError] = useState<string | null>(null);

  // If initialImageUrl changes, update preview
  useEffect(() => {
    setPreview(initialImageUrl);
  }, [initialImageUrl]);

  /**
   * Handles file selection and uploads the image to the server
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        setPreview(null);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await api.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        let imageUrl: string;
        if (typeof response === "object" && response !== null) {
          if ("url" in response) {
            imageUrl = (response as any).url;
          } else if (
            "data" in response &&
            response.data &&
            "url" in response.data
          ) {
            imageUrl = (response.data as any).url;
          } else {
            throw new Error("Could not find URL in response");
          }
        } else {
          throw new Error("Invalid response format");
        }

        if (!imageUrl) {
          throw new Error("No URL returned from server");
        }

        setPreview(imageUrl);
        onUpload(imageUrl);
      } catch (err: any) {
        let errorMessage = "Unknown error occurred";
        if (err.response) {
          if (err.response.data?.title) {
            errorMessage = err.response.data.title;
          } else if (err.response.data?.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.status === 400 && typeof err.response.data === "string") {
            errorMessage = err.response.data;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [endpoint, onUpload]
  );

  /**
   * Clears the preview and notifies parent
   */
  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemove?.();
  }, [onRemove]);

  return (
    <div className={className}>
      {preview ? (
        <div className="space-y-2">
          <div className="w-full rounded-md overflow-hidden border dark:border-foreground/30">
            <img
              src={preview}
              alt="Uploaded preview"
              className="w-full h-auto max-h-48 object-contain mx-auto"
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Remove Image
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="block w-full text-sm text-gray-500  file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 focus:outline-none cursor-pointer"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {uploading && (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <p className="text-sm text-muted-foreground">Uploading image...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;