import { useState, useCallback } from "react";
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
}

/**
 * Component for uploading images with preview functionality
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  onRemove,
  disabled = false,
  className = "",
  endpoint = "ImageUpload/question",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles file selection and uploads the image to the server
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset any previous errors
      setError(null);

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        setPreview(null);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        // Use the api client to make the request
        const response = await api.post(endpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Since we don't know the exact shape of what the api returns after interceptors,
        // we need to handle it safely
        let imageUrl: string;

        // Handle different possible response shapes
        if (typeof response === "object" && response !== null) {
          if ("url" in response) {
            // Direct response has url property
            imageUrl = (response as { url: string }).url;
          } else if (
            "data" in response &&
            typeof response.data === "object" &&
            response.data !== null &&
            "url" in response.data
          ) {
            // Response has nested data object with url
            imageUrl = (response.data as { url: string }).url;
          } else {
            throw new Error("Could not find URL in response");
          }
        } else {
          throw new Error("Invalid response format");
        }

        if (!imageUrl) {
          throw new Error("No URL returned from server");
        }

        // Update state and notify parent
        setPreview(imageUrl);
        onUpload(imageUrl);
      } catch (error) {
        let errorMessage = "Unknown error occurred";

        // Handle AxiosError-like structure (common with API clients)
        if (typeof error === "object" && error !== null) {
          if ("response" in error) {
            const response = (error as any).response;
            if (response?.data?.title) {
              errorMessage = response.data.title; // e.g., "Image dimensions too large..."
            } else if (response?.data?.message) {
              errorMessage = response.data.message;
            } else if (
              response?.status === 400 &&
              typeof response.data === "string"
            ) {
              errorMessage = response.data; // Fallback to raw string
            }
          } else if ("message" in error) {
            errorMessage = (error as Error).message;
          }
        }

        setError(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [endpoint, onUpload]
  );

  /**
   * Clear the selected file and preview
   */
  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
    
    // Call the onRemove callback to notify parent component
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="block w-full text-sm text-gray-500 
                    file:mr-4 file:py-2 file:px-4 file:rounded 
                    file:border-0 file:text-sm file:font-semibold 
                    file:bg-primary/10 file:text-primary 
                    hover:file:bg-primary/20 disabled:opacity-50 
                    focus:outline-none cursor-pointer"
          aria-label="Upload image"
        />

        {/* Inline error message */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {uploading && (
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <p className="text-sm text-muted-foreground">Uploading image...</p>
          </div>
        )}
      </div>

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Uploaded preview"
            className="max-w-full h-auto rounded-md shadow-sm"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 focus:outline-none"
            aria-label="Clear image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;