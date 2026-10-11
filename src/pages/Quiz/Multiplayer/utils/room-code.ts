/** Room codes are six letters and digits, upper-case (the server's `RoomCode`). */
export const ROOM_CODE_LENGTH = 6;

const clean = (text: string) =>
  text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, ROOM_CODE_LENGTH);

/**
 * The room code in whatever was pasted into a code field.
 *
 * What people have on the clipboard is usually the invite link, not the code —
 * `https://…/multiplayer/join?code=8UZHRH` — and the field's six-character limit turned that
 * into `HTTPS:`. So a link gives up its code (the `?code=` query, or the last segment of
 * `/multiplayer/lobby/8UZHRH`), and anything else is stripped to its letters and digits, which
 * also covers a code copied with spaces or quotes around it.
 */
export const roomCodeFromPaste = (pasted: string): string => {
  const text = pasted.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const fromQuery = url.searchParams.get("code");
      if (fromQuery) return clean(fromQuery);
      const lobby = url.pathname.match(/\/multiplayer\/lobby\/([^/]+)/i);
      if (lobby) return clean(lobby[1]);
      return "";
    } catch {
      return "";
    }
  }
  return clean(text);
};
