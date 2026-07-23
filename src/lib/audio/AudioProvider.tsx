/**
 * AudioProvider.tsx
 * -----------------
 * Mounted once near the top of the app (in Provider.tsx). It does two boring-but-important
 * jobs and renders nothing:
 *   1. Builds the sound objects and pushes saved preferences into the singleton on load.
 *   2. Satisfies the browser autoplay policy: audio can't start until the user interacts with
 *      the page, so on the very first pointer/keyboard event we unlock the audio context.
 *      After that, sounds triggered by game events play freely.
 */

import { useEffect } from "react";
import { audio } from "./AudioManager";
import { useAudioStore } from "./audio-store";

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const sync = useAudioStore((s) => s.sync);

  useEffect(() => {
    audio.init();
    sync(); // apply persisted mute/volume choices

    const unlock = () => audio.unlock();
    // `once` handlers auto-remove themselves after the first event.
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [sync]);

  return <>{children}</>;
};
