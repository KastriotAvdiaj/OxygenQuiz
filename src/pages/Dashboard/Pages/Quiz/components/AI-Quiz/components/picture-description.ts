export interface PictureDescription {
  /** A few words for the chip. */
  chip: string;
  lead: string;
  detail?: string;
}

/**
 * On the review: how many pictures were added, and which questions asked for one and got none —
 * as a chip's few words and the sentence or two behind it (`ReviewChips`). Not a warning — a
 * picture is optional — but not silent either (ADR 0005's rule for what the import changed).
 * Null when pictures were off.
 *
 * `asked` is the wizard's "Add pictures" switch. With it on and no picture question in the reply
 * (none written, or each one's picture dropped as decoration by the parser), it says so: until
 * 2026-11-14 that case showed nothing, and "the AI chose none" looked the same as "the feature is
 * broken".
 */
export const describePictures = ({
  requested,
  notFound,
  asked = false,
}: {
  requested: number;
  notFound: number[];
  asked?: boolean;
}): PictureDescription | null => {
  if (requested === 0 && !asked) return null;
  if (requested === 0) {
    return {
      chip: "No picture questions",
      lead: "Pictures were on, but the AI wrote no question that asks about one. You can add one yourself in a question.",
    };
  }
  const added = requested - notFound.length;
  if (added === 0) {
    return { chip: "No pictures found", lead: "No pictures were found for the questions that asked for one." };
  }
  return {
    chip: `${added} picture${added === 1 ? "" : "s"} added`,
    lead: `Added a picture to ${added} question${added === 1 ? "" : "s"} — check each one; swap or remove it in the question.`,
    detail:
      notFound.length > 0
        ? `None found for question${notFound.length === 1 ? "" : "s"} ${notFound.join(", ")}. You can add one yourself.`
        : undefined,
  };
};
