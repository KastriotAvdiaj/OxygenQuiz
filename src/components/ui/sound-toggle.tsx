import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAudio } from "@/lib/audio";
import { cn } from "@/utils/cn";

type SoundToggleProps = {
  className?: string;
};

/**
 * Header control for the audio system. The speaker icon reflects mute state; opening the
 * popover exposes a mute toggle plus Music / Effects volume sliders. All values are read from
 * and written to the persisted Zustand audio store via `useAudio`, so choices survive refreshes.
 */
export function SoundToggle({ className }: SoundToggleProps) {
  const {
    muted,
    toggleMuted,
    musicVolume,
    sfxVolume,
    setMusicVolume,
    setSfxVolume,
    play,
  } = useAudio();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label={muted ? "Sound off" : "Sound on"}
          className={cn(
            "flex items-center gap-2 px-4 py-2 cursor-pointer w-[fit-content] bg-background text-foreground hover:bg-background/40 border border-border/50",
            className
          )}
        >
          {muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Sound</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={() => toggleMuted()}
            >
              {muted ? "Unmute" : "Mute"}
            </Button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Music</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              disabled={muted}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Effects</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              disabled={muted}
              // Preview the effects volume as the user drags.
              onChange={(e) => {
                setSfxVolume(Number(e.target.value));
                play("tick");
              }}
              className="w-full accent-primary disabled:opacity-40"
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
