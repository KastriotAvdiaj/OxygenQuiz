import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowDown, Loader2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LiftedButton } from "@/common/LiftedButton";
import { apiErrorMessage } from "@/lib/Api-client";
import { cn } from "@/utils/cn";
import {
  MAX_STOCK_QUERY,
  useImportStockImage,
  useStockProviders,
  useStockSearch,
  type StockImage,
  type StockProviderId,
} from "../api/stock-images";
import type { MediaAsset } from "../api/upload-media";

interface StockImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the imported asset — stored, credited, not yet attached (that happens on save). */
  onPicked: (asset: MediaAsset) => void;
}

/** Wikimedia first: flags, landmarks, people and artworks are what quiz questions are about. */
const ORDER: StockProviderId[] = ["wikimedia", "pexels"];
const LABEL: Record<StockProviderId, string> = { wikimedia: "Wikimedia Commons", pexels: "Pexels" };

/**
 * Find a free image on Wikimedia Commons or Pexels instead of uploading one
 * (docs/media/media-pipeline.md, "Outside sources"). Choosing one imports it into our own storage
 * with its credit; the credit then shows wherever the image does.
 */
export function StockImageDialog({ open, onOpenChange, onPicked }: StockImageDialogProps) {
  const providers = useStockProviders(open);
  const available = ORDER.filter((id) => providers.data?.some((p) => p.id === id && p.enabled));
  const [chosen, setChosen] = useState<StockProviderId>("wikimedia");
  const provider = available.includes(chosen) ? chosen : (available[0] ?? "wikimedia");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const search = useStockSearch(provider, query);
  const importImage = useImportStockImage();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = search.data?.pages.flatMap((p) => p.items) ?? [];

  const choose = (image: StockImage) => {
    setError(null);
    setImportingId(image.id);
    importImage.mutate(image, {
      onSuccess: (asset) => {
        onPicked(asset);
        onOpenChange(false);
      },
      onError: (e) => setError(apiErrorMessage(e)),
      onSettled: () => setImportingId(null),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Find a free image</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {available.length > 1 && (
            <SegmentedControl
              aria-label="Source"
              value={provider}
              onValueChange={(v) => {
                setChosen(v);
                setError(null);
              }}
              options={available.map((id) => ({ value: id, label: LABEL[id] }))}
            />
          )}
          <form
            role="search"
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              // The dialog is portalled out of the DOM, but React still bubbles events up the
              // component tree — so without this, searching here also submitted the quiz form
              // the picker sits in.
              e.stopPropagation();
              setError(null);
              setQuery(draft.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={draft}
                maxLength={MAX_STOCK_QUERY}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={provider === "wikimedia" ? "e.g. flag of Kosovo, Eiffel Tower" : "e.g. mountain lake, coffee"}
                aria-label={`Search ${LABEL[provider]}`}
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <LiftedButton type="submit" className="flex items-center gap-2" disabled={!draft.trim()}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </LiftedButton>
          </form>
        </div>

        <AnimatePresence>
          {(error || search.isError) && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 overflow-hidden text-sm text-red-600 dark:text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error ?? apiErrorMessage(search.error)}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="-mx-1 min-h-[12rem] flex-1 overflow-y-auto px-1">
          {!query ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Only images whose licence lets anyone reuse them with credit are shown. The credit is added for you.
            </p>
          ) : search.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Searching" />
            </div>
          ) : items.length === 0 && !search.isError ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nothing found for “{query}”.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" aria-label="Results">
              {items.map((image) => (
                <li key={`${image.provider}-${image.id}`}>
                  <button
                    type="button"
                    onClick={() => choose(image)}
                    disabled={importImage.isPending}
                    title={[image.title, image.author, image.license].filter(Boolean).join(" · ")}
                    className={cn(
                      "group relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      importImage.isPending && importingId !== image.id ? "opacity-50" : "hover:shadow-md",
                    )}
                  >
                    <img
                      src={image.thumbUrl}
                      alt={image.title ?? "Search result"}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] text-white">
                      {image.author ?? "Unknown author"}
                    </span>
                    {importingId === image.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Adding" />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.hasNextPage && (
            <div className="flex justify-center pt-3">
              <LiftedButton
                type="button"
                size="sm"
                className="flex items-center gap-2 bg-muted text-foreground"
                liftColor="muted-foreground"
                disabled={search.isFetchingNextPage}
                onClick={() => search.fetchNextPage()}
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                {search.isFetchingNextPage ? "Loading…" : "More results"}
              </LiftedButton>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <LiftedButton
            type="button"
            className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground"
            liftColor="muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </LiftedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
