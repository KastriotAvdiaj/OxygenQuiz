import { BlobLoader } from "@/components/ui";
import { useAssociationBoard } from "../../api/association-quiz";

/**
 * The board of an Associations quiz, read-only, solutions shown — what the single-quiz page
 * shows where a Classic quiz lists its questions. It reads `GET /quiz/{id}/board`, which only
 * the owner or an admin may call (it is the answer key); this page is admin-only anyway.
 */
export const AssociationBoardPreview = ({ quizId }: { quizId: number }) => {
  const boardQuery = useAssociationBoard({ quizId });

  if (boardQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <BlobLoader size="md" />
      </div>
    );
  }

  const board = boardQuery.data;
  if (!board) {
    return <p className="text-sm text-muted-foreground">The board isn&apos;t available.</p>;
  }

  return (
    <section className="space-y-3" aria-label="Board">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {board.columns.map((column) => (
          <div key={column.letter} className="rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold">Column {column.letter}</h3>
            <ol className="space-y-1 text-sm">
              {[...column.tiles]
                .sort((a, b) => a.position - b.position)
                .map((tile) => (
                  <li key={tile.id} className="flex gap-2">
                    <span className="w-6 shrink-0 tabular-nums text-muted-foreground">
                      {column.letter}
                      {tile.position + 1}
                    </span>
                    <span className="min-w-0 break-words">{tile.text}</span>
                  </li>
                ))}
            </ol>
            <p className="mt-2 border-t border-dashed border-border pt-2 text-sm font-semibold text-primary">
              {column.solution}
              {column.acceptableSolutions.length > 0 && (
                <span className="font-normal text-muted-foreground"> · also {column.acceptableSolutions.join(", ")}</span>
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 text-sm">
        <span className="text-muted-foreground">Final solution: </span>
        <span className="font-semibold text-primary">{board.finalSolution}</span>
        {board.finalAcceptableSolutions.length > 0 && (
          <span className="text-muted-foreground"> · also {board.finalAcceptableSolutions.join(", ")}</span>
        )}
      </div>
    </section>
  );
};
