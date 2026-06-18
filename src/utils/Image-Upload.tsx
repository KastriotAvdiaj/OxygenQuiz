import { useState, useCallback, useEffect } from "react";
import { Upload, X, Image, CheckCircle, AlertCircle } from "lucide-react";

import { api } from "@/lib/Api-client";

/**
 * Base interface for ImageUpload component props
 */
interface BaseImageUploadProps {
  onUpload: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  endpoint?: string;
  initialImageUrl?: string | null;
  borderColor?: string;
  backgroundColor?: string;
}

/**
 * Extended interface for user-friendly variant
 */
interface UserImageUploadProps extends BaseImageUploadProps {
  title?: string;
  description?: string;
}

/**
 * Union type for all possible props
 */
type ImageUploadProps = BaseImageUploadProps | UserImageUploadProps;

/**
 * Custom hook for handling image upload logic
 */
const useImageUpload = (endpoint: string, onUpload: (url: string) => void) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
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
        let errorMessage = "Upload failed. Please try again.";
        if (err.response?.data?.title) {
          errorMessage = err.response.data.title;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (
          err.response?.status === 400 &&
          typeof err.response.data === "string"
        ) {
          errorMessage = err.response.data;
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

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    uploading,
    preview,
    error,
    setPreview,
    handleFileSelect,
    clearPreview,
  };
};

/**
 * Admin variant - Simple, functional design
 */
const AdminImageUpload: React.FC<BaseImageUploadProps> = ({
  onUpload,
  onRemove,
  disabled = false,
  className = "",
  endpoint = "ImageUpload/question",
  initialImageUrl = null,
  borderColor = "border-foreground/30",
  backgroundColor,
}) => {
  const {
    uploading,
    preview,
    error,
    setPreview,
    handleFileSelect,
    clearPreview,
  } = useImageUpload(endpoint, onUpload);

  useEffect(() => {
    setPreview(initialImageUrl);
  }, [initialImageUrl, setPreview]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleClear = useCallback(() => {
    clearPreview();
    onRemove?.();
  }, [clearPreview, onRemove]);

  const previewStyle = backgroundColor ? { backgroundColor } : {};

  return (
    <div className={`w-full max-w-sm ${className}`}>
      {preview ? (
        <div className="space-y-1.5">
          <div className={`w-full rounded-md overflow-hidden border dark:${borderColor}`} style={previewStyle}>
            <img
              src={preview}
              alt="Uploaded preview"
              className="w-full h-auto max-h-36 sm:max-h-44 object-contain mx-auto"
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
          >
            Remove Image
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={disabled || uploading}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 focus:outline-none cursor-pointer"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {uploading && (
              <div className="flex items-center">
                <div className="mr-2 h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <p className="text-xs text-muted-foreground">
                  Uploading image...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * User variant - Enhanced, quiz-friendly design
 */
const UserImageUpload: React.FC<UserImageUploadProps> = ({
  onUpload,
  onRemove,
  disabled = false,
  className = "",
  endpoint = "ImageUpload/question",
  initialImageUrl = null,
  borderColor = "border-green-200 dark:border-green-800",
  backgroundColor = "bg-green-50 dark:bg-green-900/20",
}) => {
  const {
    uploading,
    preview,
    error,
    setPreview,
    handleFileSelect,
    clearPreview,
  } = useImageUpload(endpoint, onUpload);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setPreview(initialImageUrl);
  }, [initialImageUrl, setPreview]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, handleFileSelect]
  );

  const handleClear = useCallback(() => {
    clearPreview();
    onRemove?.();
  }, [clearPreview, onRemove]);

  // Handle custom styling
  const defaultDragActiveBorder = "border-blue-400";
  const defaultDragActiveBg = "bg-blue-50 dark:bg-blue-900/20";
  const defaultBorder = "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";
  const defaultBg = "bg-muted";

  const dropZoneBorder = dragActive 
    ? (borderColor.includes('blue') ? borderColor : defaultDragActiveBorder)
    : (borderColor === "border-green-200 dark:border-green-800" ? defaultBorder : borderColor);
  
  const dropZoneBg = dragActive 
    ? (backgroundColor.includes('blue') ? backgroundColor : defaultDragActiveBg)
    : (backgroundColor === "bg-green-50 dark:bg-green-900/20" ? defaultBg : backgroundColor);

  return (
    <div className={`w-full max-w-xs sm:max-w-sm mx-auto ${className}`}>
      {preview ? (
        <div className="space-y-3">
          <div className="relative group">
            <div className={`rounded-xl overflow-hidden border-2 ${borderColor} ${backgroundColor} p-1.5`}>
              <img
                src={preview}
                alt="Quiz image preview"
                className="w-full h-36 sm:h-40 object-cover rounded-lg"
              />
              <div className="absolute top-2.5 right-2.5 bg-green-500 rounded-full p-1">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-xs text-red-600 dark:text-red-400 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Remove Image
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div
            className={`
              relative border-2 border-dashed ${dropZoneBorder} ${dropZoneBg} backdrop-blur-xl rounded-xl p-5 sm:p-6 text-center transition-all duration-200
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={disabled || uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            <div className="flex flex-col items-center space-y-2.5">
              {uploading ? (
                <>
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Uploading your image...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Please wait while we process your file
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`p-2.5 rounded-full ${
                      dragActive
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    {dragActive ? (
                      <Upload className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Image className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      {dragActive ? "Drop your image here" : "Choose an image"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Drag & drop or click to browse
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      JPG, PNG, GIF up to 5MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Images help make your quiz more engaging and visual
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main ImageUpload component with variant selection
 */
export const ImageUpload: React.FC<
  ImageUploadProps & { variant?: "admin" | "user" }
> = ({ variant = "user", ...props }) => {
  if (variant === "admin") {
    return <AdminImageUpload {...props} />;
  }

  return <UserImageUpload {...props} />;
};

export { AdminImageUpload, UserImageUpload };

export default ImageUpload;