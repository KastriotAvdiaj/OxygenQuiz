/**
 * Public entry point for the audio system.
 *
 *   import { audio } from "@/lib/audio";        // singleton, for any callback (e.g. SignalR)
 *   import { useAudio } from "@/lib/audio";     // hook, for React components
 *   import { AudioProvider } from "@/lib/audio";// mount once at the app root
 */
export { audio } from "./AudioManager";
export { useAudio } from "./useAudio";
export { useAudioStore } from "./audio-store";
export { AudioProvider } from "./AudioProvider";
export type { SoundName, MusicName } from "./sounds";
