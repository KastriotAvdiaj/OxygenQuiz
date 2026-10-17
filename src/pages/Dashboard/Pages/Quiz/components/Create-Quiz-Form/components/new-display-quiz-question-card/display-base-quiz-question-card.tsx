import { Card, CardContent } from "@/components/ui";
import { Textarea } from "@/components/ui/form";
import { QuestionType } from "@/types/question-types";
import ImageUpload from "@/utils/Image-Upload";
import { FieldError } from "react-hook-form";
import { getQuestionTypeTheme } from "../../question-type-theme";
import { ExplanationField } from "@/common/QuestionExplanation";

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

  // Optional "why" shown to players after they answer (docs/quiz/question-explanations.md).
  // Rendered below the type-specific content because it is about the answer, not the question.
  explanation?: string;
  onExplanationChange?: (explanation: string) => void;
  explanationError?: FieldError;
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
  explanation = "",
  onExplanationChange,
  explanationError,
}) => {
  // Tint this card's minimal inputs (question text, answers) with the question type's hue.
  // `--field-accent` cascades to every minimal input inside — see global.css.
  const fieldAccent = questionType
    ? getQuestionTypeTheme(questionType).fieldAccent
    : undefined;

  return (
    <Card
      className={`bg-background border border-l-[3px] ${borderColor} dark:bg-muted/30 ${backgroundColor} relative overflow-hidden`}
      style={
        {
          backgroundImage: `url('/src/assets/classroom.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          ...(fieldAccent ? { "--field-accent": fieldAccent } : {}),
        } as React.CSSProperties
      }
    >
      {/* Optional: Add overlay for better text readability */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-[1px]" />

      {/* Dark-mode only: a very slight wash of the question type's color over the readability
          overlay. Light mode already reads well, so this layer is hidden there. */}
      {fieldAccent && (
        <div
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={
            { backgroundColor: "hsl(var(--field-accent) / 0.05)" } as React.CSSProperties
          }
        />
      )}

      <CardContent className="p-6 space-y-6 relative z-10">
        {/* Question Text Section */}
        <div className="px-0">
          {/* <section className="flex flex-col items-center w-full">
            <Label className="text-lg font-bold">Question</Label>
          </section> */}
          {/* A textarea that grows with the question, not a one-line input: a long question
              was cut off at the field's edge — on a phone after ~15 characters — so it could
              not be read, let alone checked. Still one line of *data*: Enter doesn't insert a
              newline, since a question has never had one. `field-sizing: content` grows it
              where supported; elsewhere it is two rows that scroll. `!max-h-48` lifts
              `.minimal-input`'s one-line 3rem cap. 18px, 20px from `lg`: it was 24px, which on a
              desktop made the question shout over everything else in the editor. */}
          <Textarea
            id="question-text"
            variant="minimal"
            rows={2}
            className="w-full resize-none !max-h-48 !text-lg leading-snug [field-sizing:content] lg:!text-xl"
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => onQuestionTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
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

        {onExplanationChange && (
          <ExplanationField
            id={`question-explanation-${questionType ?? "new"}`}
            // The card's own field style, so it takes the type's accent (--field-accent)
            // and the form's font like the question and answers above it.
            variant="minimal"
            value={explanation}
            onChange={onExplanationChange}
            error={explanationError}
          />
        )}
      </CardContent>
    </Card>
  );
};
