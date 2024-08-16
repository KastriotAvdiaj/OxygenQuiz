import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const isLightMode = theme === "light";

  return (
    <Button
      variant="outline"
      size="icon"
      className="flex items-center gap-2 px-4 py-2 cursor-pointer w-[fit-content]"
      onClick={() => setTheme(isLightMode ? "dark" : "light")}
    >
      {isLightMode ? (
        <>
          <Moon className="h-5 w-5" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span>Light Mode</span>
        </>
      )}
    </Button>
  );
}
