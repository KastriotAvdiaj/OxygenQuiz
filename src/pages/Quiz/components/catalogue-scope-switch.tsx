import { useState } from "react";
import { ArrowRight, Users, X } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CatalogueScope } from "@/pages/Dashboard/Pages/Quiz/api/search-quizzes";

/** The two halves of the public catalogue offered to a player ("all" is the API's default, unused here). */
export type CatalogueChoice = Extract<CatalogueScope, "picked" | "community">;

const OPTIONS: { value: CatalogueChoice; label: string }[] = [
  { value: "picked", label: "Picked" },
  { value: "community", label: "Community" },
];

/** Remembered per browser: the notice is a one-time heads-up, not a gate. */
export const COMMUNITY_NOTICE_KEY = "oxygen.communityNoticeSeen";

const noticeSeen = () => {
  try {
    return window.localStorage.getItem(COMMUNITY_NOTICE_KEY) === "1";
  } catch {
    return false; // private window, blocked storage: show it again, harmlessly
  }
};

const rememberNotice = () => {
  try {
    window.localStorage.setItem(COMMUNITY_NOTICE_KEY, "1");
  } catch {
    /* nothing to do — see noticeSeen */
  }
};

/**
 * Picked quizzes (house quizzes and community quizzes the team chose) or everyone's
 * (docs/media/moderation.md, "Picked and community quizzes"). The first switch to Community
 * says what's different there: nobody has checked those quizzes yet.
 */
export function CatalogueScopeSwitch({
  value,
  onValueChange,
}: {
  value: CatalogueChoice;
  onValueChange: (next: CatalogueChoice) => void;
}) {
  const [asking, setAsking] = useState(false);

  const choose = (next: CatalogueChoice) => {
    if (next === "community" && !noticeSeen()) {
      setAsking(true);
      return;
    }
    onValueChange(next);
  };

  const accept = () => {
    rememberNotice();
    setAsking(false);
    onValueChange("community");
  };

  return (
    <>
      <SegmentedControl aria-label="Catalogue" value={value} onValueChange={choose} options={OPTIONS} />
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              Community quizzes
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            These are made by players and haven't been checked by our team. Some may have wrong
            answers or images you'd rather not see. If something's off, use <strong>Report</strong> —
            it reaches the author or our moderators.
          </p>
          <DialogFooter className="gap-2">
            <LiftedButton className="flex items-center gap-2" onClick={accept}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              Show community quizzes
            </LiftedButton>
            <LiftedButton
              className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground"
              liftColor="muted"
              onClick={() => setAsking(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </LiftedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
