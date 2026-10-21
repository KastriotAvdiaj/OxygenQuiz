import { useMemo, type CSSProperties, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, Globe, HelpCircle, Play, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/Spinner";
import { LiftedButton } from "@/common/LiftedButton";
import { listingPath } from "@/lib/quiz-listing-url";
import { NotFoundContent } from "@/pages/UtilityPages/NotFound/Not-Found-Content";
import { describeListing } from "../../../../worker/listing.js";
import { parseQuizPalette, quizEdgeColor, readableTextColor } from "../components/quiz-palette";
import { secondsToMinutes } from "../components/quiz-duration";
import { quizPlayPath } from "../quiz-play-path";
import { useQuizListing, type QuizListing } from "./api/get-quiz-listing";

/**
 * The quiz listing — the public page for one Public quiz at `/q/:quizId/:slug`
 * (docs/quiz/quiz-listing.md). The Worker has already written the same facts into the HTML for
 * crawlers (worker/listing.js); this is what a person sees once the app boots and replaces it.
 * **The two must say the same things** (ADR 0028) — change one, change the other.
 *
 * The same page for everyone. Only Play differs, and the play route decides that: a guest gets the
 * free guest attempt or the login prompt, a signed-in player starts (docs/auth/guest-play.md).
 */
export function QuizListingPage() {
  const { quizId: rawId } = useParams();
  const quizId = Number(rawId);
  const valid = Number.isInteger(quizId) && quizId > 0;
  const { data: listing, isPending, isError } = useQuizListing(quizId, valid);
  const { pathname, search } = useLocation();

  if (!valid || isError) {
    return (
      <NotFoundContent
        title="Quiz not found"
        message="This quiz isn't public, or it doesn't exist any more."
        linkText="Browse quizzes"
        linkTo="/choose-quiz"
      />
    );
  }
  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // In production the Worker 301s a stale slug before the app loads; this covers navigation
  // inside the app and the dev server, which has no Worker.
  const canonical = listingPath(listing.id, listing.title);
  if (pathname !== canonical) return <Navigate to={`${canonical}${search}`} replace />;

  return <ListingCard listing={listing} />;
}

function ListingCard({ listing }: { listing: QuizListing }) {
  const navigate = useNavigate();
  const colors = useMemo(() => parseQuizPalette(listing.colorPaletteJson ?? undefined), [listing.colorPaletteJson]);
  const accent = colors[0];
  const isBoard = listing.format === "Associations";
  const created = new Date(listing.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 font-quiz">
      {/* The start modal's silhouette and the category's edge colour, so a listing reads as the
          same quiz a catalogue card opens. */}
      <article
        className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-[0_4px_0_0_var(--edge)]"
        style={{ "--edge": quizEdgeColor(accent) } as CSSProperties}
      >
        {listing.imageUrl && (
          <img src={listing.imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
        )}
        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs"
              style={{ backgroundColor: `${accent}15`, borderColor: `${accent}40`, color: accent }}
            >
              {listing.category}
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs"
            >
              {listing.difficulty}
            </Badge>
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-wider text-foreground sm:text-4xl">
            {listing.title}
          </h1>
          <p className="font-app text-sm leading-relaxed text-muted-foreground sm:text-base">
            {describeListing(listing)}
          </p>

          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4 text-sm sm:text-base">
            <Fact icon={HelpCircle} accent={accent} label={isBoard ? "Format" : "Questions"}>
              {isBoard ? "Associations board" : listing.questionCount}
            </Fact>
            {listing.timeLimitInSeconds > 0 && (
              <Fact icon={Clock} accent={accent} label="Duration">
                {secondsToMinutes(listing.timeLimitInSeconds)}
              </Fact>
            )}
            <Fact icon={Globe} accent={accent} label="Language">
              {listing.language}
            </Fact>
            {!isBoard && (
              <Fact icon={HelpCircle} accent={accent} label="Format">
                Classic
              </Fact>
            )}
            <Fact icon={User} accent={accent} label="By">
              {listing.author}
            </Fact>
            <Fact icon={Calendar} accent={accent} label="Created">
              {created}
            </Fact>
          </dl>

          <div className="flex justify-center pt-1">
            <LiftedButton
              type="button"
              onClick={() => navigate(quizPlayPath(listing))}
              liftColor={accent}
              className="h-11 flex items-center gap-2 px-8 text-base font-bold tracking-wider sm:text-lg bg-[var(--face)] text-[color:var(--face-text)]"
              style={{ "--face": accent, "--face-text": readableTextColor(accent) } as CSSProperties}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              Play
            </LiftedButton>
          </div>
        </div>
      </article>
    </main>
  );
}

function Fact({
  icon: Icon,
  accent,
  label,
  children,
}: {
  icon: typeof Clock;
  accent: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-lg p-2" style={{ backgroundColor: `${accent}15` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
      </div>
      <div>
        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="font-bold text-foreground">{children}</dd>
      </div>
    </div>
  );
}
