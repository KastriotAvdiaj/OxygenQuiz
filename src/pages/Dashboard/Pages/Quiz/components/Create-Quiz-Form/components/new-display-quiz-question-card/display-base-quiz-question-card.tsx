import { Card, CardContent } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { QuestionType } from "@/types/ApiTypes";
import ImageUpload from "@/utils/Image-Upload";

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
}) => {
  return (
    <Card
      className={`bg-background border ${borderColor} dark:bg-muted/30 ${backgroundColor}`}
    >
      <CardContent className="p-6 space-y-6">
        {/* Question Text Section */}
        <div className="px-0">
          <section className="flex flex-col items-center w-full">
            <Label className="text-lg font-bold">Question</Label>
          </section>
          <Input
            id="question-text"
            variant="quiz"
            className="!text-[1.5rem] py-6 w-full"
            questionType={questionType}
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => onQuestionTextChange(e.target.value)}
          />
        </div>

        {/* Image Upload Section */}
        {showImageUpload && onImageUpload && (
          <div className="px-0">
            <ImageUpload
              initialImageUrl={imageUrl}
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
