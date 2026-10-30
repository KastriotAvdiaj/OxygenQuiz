// Types for listing-url.js, which the SPA imports so the Worker and the app build the same URL.
export declare const SITE_ORIGIN: string;
export declare const LISTING_PATH: RegExp;
export declare function slugify(title: string): string;
export declare function listingPath(id: number, title: string): string;
export declare function listingUrl(id: number, title: string): string;
