import { useState } from "react";
import { ScanText } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import type {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";
import { useCanShareQuestions } from "../../Entities/select-visibility";
import { useScreenshotImportStatus } from "./screenshot-import-api";
import { ScreenshotImportDialog } from "./screenshot-import-dialog";

/**
 * The fourth card in the admin Questions page's "Choose the type of question" dialog — the same
 * shape as the three type cards (QuestionTypeButton). Shown only to staff, and only once the
 * feature is switched on (`Ai:ScreenshotImport:Enabled`, docs/quiz/screenshot-import.md); until
 * then it isn't there at all, so the dialog looks as it always has.
 */
export const ScreenshotImportCard = ({
  categories,
  difficulties,
  languages,
  onOpened,
}: {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  /** The type chooser closes behind the import's own dialog. */
  onOpened?: () => void;
}) => {
  const isStaff = useCanShareQuestions();
  const { data: status } = useScreenshotImportStatus(isStaff);
  const [open, setOpen] = useState(false);

  if (!status?.enabled) return null;

  return (
    <>
      <LiftedButton
        type="button"
        liftColor="muted"
        outerClassName="w-full"
        className="flex h-full w-full flex-col items-center justify-center gap-2.5 text-center leading-tight border border-foreground/30 bg-background px-2 py-3 text-sm text-foreground"
        onClick={() => {
          setOpen(true);
          onOpened?.();
        }}
      >
        <span className="flex h-8 items-center" aria-hidden="true">
          <ScanText className="h-6 w-6" />
        </span>
        From a screenshot
      </LiftedButton>
      <ScreenshotImportDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        difficulties={difficulties}
        languages={languages}
        maxImages={status.maxImagesPerImport}
        imagesLeftToday={status.imagesLeftToday}
      />
    </>
  );
};

/** Whether the card will show — so the dialog can lay out three cards or four. */
export const useScreenshotImportAvailable = () => {
  const isStaff = useCanShareQuestions();
  return useScreenshotImportStatus(isStaff).data?.enabled === true;
};
