import { createContext } from "react";

/**
 * Accordion coordination for a group of facets. When a provider is present, the
 * sections inside it behave as an accordion — opening one closes whichever was
 * open — so only one option list is ever expanded. Two open lists stacked
 * overflow the panel and bring in a scrollbar that eats a noticeable strip of a
 * narrow drawer; one open list always fits. Without a provider, each section
 * keeps its own open state (the multiplayer dialog's side-by-side grid).
 */
export const FacetAccordionContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);
