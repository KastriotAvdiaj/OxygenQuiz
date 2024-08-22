import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

type ModeToggleProps = {
  className?: string;
  text?: boolean;
};

export function ModeToggle({ className, text }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();

  const isLightMode = theme === "light";

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "flex items-center gap-2 px-4 py-2 cursor-pointer w-[fit-content]",
        className
      )}
      onClick={() => setTheme(isLightMode ? "dark" : "light")}
    >
      {isLightMode ? (
        <>
          <Moon className="h-5 w-5" />
          {text && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          {text && <span>Dark Mode</span>}
        </>
      )}
    </Button>
  );
}
