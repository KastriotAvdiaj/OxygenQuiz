import { useMemo } from "react";
import { FieldError } from "react-hook-form";

/**
 * Common interface for validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Hook to handle common form validation logic
 */
export const useFormValidation = (
  questionId: number,
  questionErrors: any,
  getQuestionErrors: (id: number) => ValidationError[]
) => {
  // Get all errors for this question
  const allErrors = useMemo(() => {
    return getQuestionErrors(questionId);
  }, [questionId, questionErrors, getQuestionErrors]);

  // Helper function to get error for a specific field
  const getFieldError = (fieldPath: string): FieldError | undefined => {
    const error = allErrors.find((err) => err.field === fieldPath);
    return error ? { type: "manual", message: error.message } : undefined;
  };

  // Helper function to get error for answer option by index
  const getAnswerOptionError = (index: number): FieldError | undefined => {
    const error = allErrors.find(
      (err) =>
        err.field === `answerOptions.${index}.text` ||
        err.field === `answerOptions[${index}].text`
    );
    return error ? { type: "manual", message: error.message } : undefined;
  };

  // Check if there are any errors for this question
  const hasErrors = allErrors.length > 0;

  // Get general validation errors (not field-specific)
  const getGeneralErrors = (excludeFields: string[] = []) => {
    return allErrors.filter(
      (err) => !excludeFields.some((field) => err.field.startsWith(field))
    );
  };

  return {
    allErrors,
    getFieldError,
    getAnswerOptionError,
    hasErrors,
    getGeneralErrors,
  };
};

/**
 * Common props for image handling
 */
export interface ImageHandlerProps {
  imageUrl?: string;
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
}

/**
 * Hook for common image handling logic
 */
export const useImageHandler = () => {
  const handleImageUpload = (
    url: string,
    setImageUrl: (url: string | undefined) => void
  ) => {
    setImageUrl(url);
  };

  const handleImageRemove = (
    setImageUrl: (url: string | undefined) => void
  ) => {
    setImageUrl(undefined);
  };

  return {
    handleImageUpload,
    handleImageRemove,
  };
};

/**
 * Component for displaying general validation errors
 */
interface ValidationErrorsDisplayProps {
  errors: ValidationError[];
  className?: string;
}

export const ValidationErrorsDisplay: React.FC<
  ValidationErrorsDisplayProps
> = ({ errors, className = "" }) => {
  if (errors.length === 0) return null;

  return (
    <div className={`mt-4 space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <div
          key={index}
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2"
        >
          {error.message}
        </div>
      ))}
    </div>
  );
};

/**
 * Get error-aware styling for form components
 */
export const getErrorAwareStyles = (
  hasErrors: boolean,
  defaultStyles: { borderColor: string; backgroundColor: string }
) => ({
  borderColor: hasErrors ? "border-red-500" : defaultStyles.borderColor,
  backgroundColor: hasErrors
    ? "bg-red-50/50 dark:bg-red-950/10"
    : defaultStyles.backgroundColor,
});
