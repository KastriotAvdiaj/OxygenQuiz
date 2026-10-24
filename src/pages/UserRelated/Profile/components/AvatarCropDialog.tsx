import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useReducedMotion } from "framer-motion";
import { Check, Image as ImageIcon, Loader2, RotateCw, X } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ROTATE_MS = 200;

interface AvatarCropDialogProps {
  /** Object URL of the picked photo. The dialog is mounted with `key={src}`, so a new photo starts
   * from a fresh zoom/position/rotation without an Effect. */
  src: string;
  /** True while the cropped file is uploading: the Apply button spins and nothing can be changed. */
  saving: boolean;
  onApply: (area: Area, rotation: number) => void;
  onCancel: () => void;
}

/**
 * Pick the part of a photo that becomes your avatar: drag to move, the slider or the wheel or a
 * pinch to zoom, a button to turn it 90°. The circle is the avatar; what's outside it is dimmed.
 *
 * Before this, a picked photo was uploaded whole and the round avatar squeezed it to fit — a wide
 * photo came out as a sliver of someone's face. See docs/media/file-storage.md, "Avatar change".
 */
export const AvatarCropDialog = ({ src, saving, onApply, onCancel }: AvatarCropDialogProps) => {
  const reduceMotion = useReducedMotion();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  // A turn animates (nothing in the UI snaps), but dragging and zooming must track the pointer
  // with no lag, so the transition is on only for the moment of a turn.
  const [turning, setTurning] = useState(false);

  const rotate = () => {
    setRotation((r) => r + 90);
    if (reduceMotion) return;
    setTurning(true);
    window.setTimeout(() => setTurning(false), ROTATE_MS);
  };

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setRotation(0);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="bg-background text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            style={{
              mediaStyle: turning ? { transition: `transform ${ROTATE_MS}ms ease-out` } : undefined,
              cropAreaStyle: { border: "3px solid white", color: "rgb(0 0 0 / 0.6)" },
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={saving}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full accent-primary disabled:opacity-40"
          />
          <ImageIcon className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button
            type="button"
            onClick={rotate}
            disabled={saving}
            aria-label="Rotate 90 degrees"
            className="ml-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <RotateCw className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="mr-auto text-sm text-primary hover:underline disabled:opacity-40"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <LiftedButton
              className="flex items-center gap-2"
              disabled={saving || !area}
              onClick={() => area && onApply(area, rotation)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Apply
            </LiftedButton>
            <LiftedButton
              className="flex items-center gap-2 border border-foreground/30 bg-background text-foreground"
              liftColor="muted"
              disabled={saving}
              onClick={onCancel}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </LiftedButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
