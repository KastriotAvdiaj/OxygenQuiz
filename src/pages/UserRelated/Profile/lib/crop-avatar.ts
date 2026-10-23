import type { Area } from "react-easy-crop";

/** Side of the square avatar we upload. The server stores it as sent; 512 is sharp on a 2x screen at
 * the largest size we draw an avatar (96px on the profile) with room to spare, and stays far below
 * the 5 MB limit whatever the source was. */
export const AVATAR_OUTPUT_SIZE = 512;

/** The bounding box of a `width × height` rectangle rotated by `degrees`. Rotating a photo 90° in
 * the cropper swaps its sides, and any other angle grows the box, so the canvas the image is drawn
 * onto before cropping must be this size or the corners are cut off. */
export function rotatedBoundingBox(width: number, height: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: Math.round(cos * width + sin * height),
    height: Math.round(sin * width + cos * height),
  };
}

/** The file name the server will see. Its extension must match the bytes, because the avatar
 * endpoint checks both — and `canvas.toBlob` quietly falls back to PNG on browsers that can't
 * encode WebP (Safari), so the name is taken from the blob that came out, not from what we asked
 * for. */
export function avatarFileName(blobType: string) {
  return blobType === "image/webp" ? "avatar.webp" : blobType === "image/jpeg" ? "avatar.jpg" : "avatar.png";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be read."));
    image.src = src;
  });
}

/**
 * Draws the chosen square of the photo — `area` is in the *rotated* image's pixels, as
 * react-easy-crop reports it — onto an `AVATAR_OUTPUT_SIZE` canvas and returns it as a file ready
 * for the avatar endpoint. The circle in the dialog is only a mask: we upload the square and every
 * avatar is drawn round by CSS, so nothing outside the circle is ever shown.
 */
export async function cropAvatar(src: string, area: Area, rotation: number): Promise<File> {
  const image = await loadImage(src);
  const box = rotatedBoundingBox(image.naturalWidth, image.naturalHeight, rotation);

  // 1. The whole photo, rotated, on a canvas big enough to hold it.
  const rotated = document.createElement("canvas");
  rotated.width = box.width;
  rotated.height = box.height;
  const rctx = rotated.getContext("2d");
  if (!rctx) throw new Error("Your browser can't edit images.");
  rctx.translate(box.width / 2, box.height / 2);
  rctx.rotate((rotation * Math.PI) / 180);
  rctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  // 2. The chosen square of that, scaled to the output size.
  const out = document.createElement("canvas");
  out.width = AVATAR_OUTPUT_SIZE;
  out.height = AVATAR_OUTPUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Your browser can't edit images.");
  octx.imageSmoothingQuality = "high";
  octx.drawImage(
    rotated,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("The cropped image could not be saved.");
  return new File([blob], avatarFileName(blob.type), { type: blob.type });
}
