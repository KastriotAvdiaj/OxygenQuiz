import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeSetting } from "@/hooks/use-theme-setting";
import { cn } from "@/utils/cn";

type ModeToggleProps = {
  className?: string;
  text?: boolean;
};

export function ModeToggle({ className, text }: ModeToggleProps) {
  // changeTheme applies locally and persists to the user's settings when signed in.
  const { theme, changeTheme } = useThemeSetting();

  const isLightMode = theme === "light";

  return (
    <Button
      size="icon"
      className={cn(
        "flex items-center gap-2 px-4 py-2 cursor-pointer w-[fit-content] bg-background text-foreground hover:bg-background/40 border border-border/50",
        className
      )}
      onClick={() => changeTheme(isLightMode ? "dark" : "light")}
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
