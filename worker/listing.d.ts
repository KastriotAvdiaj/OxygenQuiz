// Types for the part of listing.js the SPA uses, so its page says what the Worker's page says.
export declare function describeListing(listing: {
  title: string;
  description?: string | null;
  category?: string;
  format?: string;
  questionCount?: number;
}): string;
