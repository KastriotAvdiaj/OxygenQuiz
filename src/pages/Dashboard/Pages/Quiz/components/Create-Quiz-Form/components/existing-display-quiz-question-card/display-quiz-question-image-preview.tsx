import React from "react";
import { ImageIcon, Music } from "lucide-react";
import type { QuestionMediaType } from "@/types/question-types";

interface QuestionImagePreviewProps {
  mediaUrl: string;
  mediaType?: QuestionMediaType | null;
  previewBorderColor: string;
}

/**
 * A saved question's media inside a builder card: a one-line note, with the image on hover so the
 * card stays compact — or, for a clip, a small player, since there is nothing to hover-preview.
 */
export const QuestionImagePreview: React.FC<QuestionImagePreviewProps> = ({
  mediaUrl,
  mediaType,
  previewBorderColor,
}) =>
  mediaType === "Audio" ? (
    <div className="mb-3 flex w-full flex-col gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 p-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Music size={16} aria-hidden="true" />
        This question includes an audio clip
      </span>
      <audio controls src={mediaUrl} className="w-full" />
    </div>
  ) : (
    <div className="relative w-full mb-3">
      <div className="group relative">
        <div className="flex items-center gap-2 p-3 border border-dashed border-muted-foreground/40 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
          <ImageIcon size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            This question includes an image • Hover to preview
          </span>
        </div>

        <div className={`absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 bg-white dark:bg-gray-900 border ${previewBorderColor} border-dashed rounded-lg shadow-xl p-2 max-w-sm`}>
          <img
            src={mediaUrl}
            alt="Question image preview"
            className="w-full h-auto max-h-48 object-contain rounded"
          />
        </div>
      </div>
    </div>
  );
