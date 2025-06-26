import { Card, CardContent } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { QuestionType } from "@/types/question-types";
import ImageUpload from "@/utils/Image-Upload";
import { FieldError } from "react-hook-form";

interface BaseQuestionFormCardProps {
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  children: React.ReactNode;
  borderColor: string;
  backgroundColor?: string;
  questionType?: QuestionType;
  // Image upload props
  imageUrl?: string | null;
  onImageUpload?: (url: string) => void;
  onImageRemove?: () => void;
  imageUploadEndpoint?: string;
  showImageUpload?: boolean;

  questionTextError?: FieldError;
}

export const BaseQuestionFormCard: React.FC<BaseQuestionFormCardProps> = ({
  questionText,
  onQuestionTextChange,
  children,
  borderColor,
  backgroundColor,
  questionType,
  imageUrl = null,
  onImageUpload,
  onImageRemove,
  imageUploadEndpoint = "ImageUpload/question",
  showImageUpload = true,
  questionTextError,
}) => {
  return (
    <Card
      className={`bg-background border ${borderColor} dark:bg-muted/30 ${backgroundColor} relative overflow-hidden`}
      style={{
        backgroundImage: `url('/src/assets/classroom.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Optional: Add overlay for better text readability */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-[1px]" />

      <CardContent className="p-6 space-y-6 relative z-10">
        {/* Question Text Section */}
        <div className="px-0">
          <section className="flex flex-col items-center w-full">
            <Label className="text-lg font-bold">Question</Label>
          </section>
          <Input
            id="question-text"
            variant={`${questionTextError ? "isIncorrect" : "quiz"}`}
            className="!text-[1.5rem] py-6 w-full"
            questionType={questionType}
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => onQuestionTextChange(e.target.value)}
            error={questionTextError}
          />
        </div>

        {/* Image Upload Section */}
        {showImageUpload && onImageUpload && (
          <div className="px-0">
            <ImageUpload
              initialImageUrl={imageUrl}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
              onUpload={onImageUpload}
              onRemove={onImageRemove}
              endpoint={imageUploadEndpoint}
              className="w-full"
            />
          </div>
        )}

        {/* Question Type Specific Content */}
        {children}
      </CardContent>
    </Card>
  );
};
