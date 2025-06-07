import React from "react";
import { ImageIcon } from "lucide-react";

interface QuestionImagePreviewProps {
  imageUrl: string;
  previewBorderColor: string;
}

export const QuestionImagePreview: React.FC<QuestionImagePreviewProps> = ({
  imageUrl,
  previewBorderColor
}) => (
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
          src={imageUrl}
          alt="Question image preview"
          className="w-full h-auto max-h-48 object-contain rounded"
        />
      </div>
    </div>
  </div>
);

