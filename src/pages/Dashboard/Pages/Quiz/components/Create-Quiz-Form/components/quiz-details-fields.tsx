import { Info } from "lucide-react";
import { MediaPicker } from "@/features/media/components/media-picker";
import type {
  FieldErrors,
  UseFormClearErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

import { Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui";

import type { CreateQuizInput } from "../../../api/create-quiz";
import { CategorySelect } from "../../../../Question/Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../../Question/Entities/Language/components/select-question-language";
import type { QueryData } from "../types";

export interface QuizDetailsFieldsProps {
  register: UseFormRegister<CreateQuizInput>;
  watch: UseFormWatch<CreateQuizInput>;
  setValue: UseFormSetValue<CreateQuizInput>;
  clearErrors: UseFormClearErrors<CreateQuizInput>;
  errors: FieldErrors<CreateQuizInput>;
  queryData: Pick<QueryData, "categories" | "difficulties" | "languages">;
  /** False while any lookup is still "Unspecified" — Public is offered but disabled. */
  canPublish: boolean;
  /** Which lookups are still "Unspecified", for the note under Status. */
  unspecifiedFields: string[];
}

/**
 * The quiz-level fields — title, description, classification, status and options.
 *
 * One component, two homes: the Quiz tab of the desktop builder's sidebar, and the
 * "Edit details" dialog of the quiz overview (phones, and AI review on every screen —
 * docs/adr/0026-the-quiz-overview.md). Only one is ever mounted, so the fields register with react-hook-form once.
 * The dialog unmounts them when it closes; the form keeps their values (`shouldUnregister`
 * is off), which is what lets the overview's summary card read them back.
 */
export const QuizDetailsFields = ({
  register,
  watch,
  setValue,
  clearErrors,
  errors,
  queryData,
  canPublish,
  unspecifiedFields,
}: QuizDetailsFieldsProps) => (
  <>
    {/* Basic Information */}
    <div className="space-y-2">
      <div>
        <Label
          htmlFor="title"
          className="text-sm font-medium flex items-center gap-1"
        >
          Quiz Title <span className="text-destructive">*</span>
        </Label>
        <Input
          variant={errors.title ? "isIncorrect" : "minimal"}
          id="title"
          placeholder="Enter quiz title"
          className="mt-1"
          {...register("title")}
          error={errors.title}
        />
      </div>

      <div>
        <Label
          htmlFor="description"
          className="text-sm font-medium"
        >
          Description
        </Label>
        <Textarea
          variant="minimal"
          id="description"
          placeholder="Describe your quiz"
          className="mt-1 min-h-[80px] resize-none"
          {...register("description")}
          error={errors.description}
        />
      </div>
    </div>
    <Separator className="bg-primary/20" />

    {/* Cover image: shown on the quiz's card, its listing page and link previews. Images only —
        the API refuses an audio cover (MediaAttachmentService). */}
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Cover image</Label>
      <MediaPicker
        allowAudio={false}
        value={watch("cover") ?? null}
        onChange={(cover) => setValue("cover", cover, { shouldDirty: true })}
        className="max-w-none sm:max-w-none"
      />
    </div>

    {/* Dropdowns */}
    <div className="space-y-3">
      {/* "Filters" alone left three dropdowns reading as bare values:
          a first-time user sees "Programming" and "Hard" with nothing
          saying what either is a *kind* of. Each select already knows its
          own name — it just never showed it. Sized and coloured like the
          "Status" label under Settings below, so the panel reads as one
          list of labelled fields rather than two conventions. */}
      <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
        Filters
      </h4>
      <CategorySelect
        label="Category"
        categories={queryData.categories}
        fieldVariant="form"
        value={watch("categoryId")?.toString() || ""}
        onChange={(selectedValue: string) =>
          setValue("categoryId", parseInt(selectedValue, 10))
        }
        includeAllOption={false}
        error={errors["categoryId"]?.message}
        clearErrors={() => clearErrors("categoryId")}
      />

      <DifficultySelect
        label="Difficulty"
        difficulties={queryData.difficulties}
        fieldVariant="form"
        value={watch("difficultyId")?.toString() || ""}
        onChange={(selectedValue: string) =>
          setValue("difficultyId", parseInt(selectedValue, 10))
        }
        includeAllOption={false}
        error={errors["difficultyId"]?.message}
        clearErrors={() => clearErrors("difficultyId")}
      />

      <LanguageSelect
        label="Language"
        languages={queryData.languages}
        fieldVariant="form"
        value={watch("languageId")?.toString() || ""}
        includeAllOption={false}
        onChange={(selectedValue: string) =>
          setValue("languageId", parseInt(selectedValue, 10))
        }
        error={errors["languageId"]?.message}
        clearErrors={() => clearErrors("languageId")}
      />
    </div>

    <Separator className="bg-primary/20" />

    {/* Quiz Settings */}
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
        Settings
      </h4>

      <div>
        <Label className="text-xs font-medium flex items-center gap-2 mb-2">
          Status
        </Label>
        <Select
          value={watch("status") || "Draft"}
          onValueChange={(value) =>
            setValue(
              "status",
              value as "Draft" | "Unlisted" | "Public",
            )
          }
        >
          <SelectTrigger
            variant={errors.status ? "form-error" : "form"}
            className="w-full"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent
            variant={errors.status ? "form-error" : "form"}
          >
            <SelectItem
              variant={errors.status ? "form-error" : "form"}
              value="Draft"
            >
              Draft — only you can see it
            </SelectItem>
            <SelectItem
              variant={errors.status ? "form-error" : "form"}
              value="Unlisted"
            >
              Unlisted — playable via share link
            </SelectItem>
            {/* Radix's own `data-[disabled]` styling (opacity + no pointer
                events) already lives in SelectItem's base class, so disabling is
                the whole change. The option stays *visible* rather than being
                removed: a missing row reads as a feature that doesn't exist,
                where a greyed one plus the note below reads as a condition the
                user can satisfy. */}
            <SelectItem
              variant={errors.status ? "form-error" : "form"}
              value="Public"
              disabled={!canPublish}
            >
              Public — listed for everyone
              {!canPublish && " (needs a full classification)"}
            </SelectItem>
          </SelectContent>
        </Select>
        {!canPublish && (
          <p className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Set a real{" "}
              <span className="text-foreground font-medium">
                {unspecifiedFields.length === 3
                  ? `${unspecifiedFields[0]}, ${unspecifiedFields[1]} and ${unspecifiedFields[2]}`
                  : unspecifiedFields.join(" and ")}
              </span>{" "}
              above to publish this quiz. Draft and Unlisted work
              either way.
            </span>
          </p>
        )}
        {errors.status && (
          <p className="text-sm text-red-500 mt-1">
            {errors.status.message
              ? errors.status.message
              : "Please select a status."}
          </p>
        )}
      </div>
    </div>

    <Separator className="bg-primary/20" />

    {/* Toggle Options */}
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary">
        Options
      </h4>

      <div className="flex items-center justify-between">
        <Label
          htmlFor="showFeedback"
          className="text-sm font-medium flex items-center gap-2"
        >
          Instant Feedback
        </Label>
        <Switch
          id="showFeedback"
          checked={watch("showFeedbackImmediately") || false}
          onCheckedChange={(checked) =>
            setValue("showFeedbackImmediately", checked)
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Label
          htmlFor="shuffleQuestions"
          className="text-sm font-medium flex items-center gap-2"
        >
          Shuffle Questions
        </Label>
        <Switch
          id="shuffleQuestions"
          checked={watch("shuffleQuestions") || false}
          onCheckedChange={(checked) =>
            setValue("shuffleQuestions", checked)
          }
        />
      </div>
    </div>
  </>
);
