import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useUser } from "@/lib/Auth";
import { useLogout } from "@/lib/Auth";
import { useDisclosure } from "@/hooks/use-disclosure";
import { ProfileButton } from "./profile-button";
import { DrawerHeaderContent } from "./drawer-header";
import { DrawerLinks } from "./drawer.links";
import { Button } from "@/components/ui/button";
import { DrawerClose } from "@/components/ui/drawer";
import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";

export const DrawerFilled = () => {
  const { data: user } = useUser();
  const isAdmin =
    user?.roles?.some((r) => r === "Admin" || r === "SuperAdmin") ?? false;
  const logout = useLogout();
  const { isOpen, close, toggle } = useDisclosure();

  return (
    <>
      {user ? (
        <Drawer open={isOpen} onOpenChange={toggle}>
          <DrawerTrigger asChild>
            <ProfileButton />
          </DrawerTrigger>
          {/* w-56: 200px left "Admin Dashboard" almost touching the edge once the rows
              gained dashboard-style padding. space-y-0 overrides DrawerHeader's stacking —
              the header now owns its own spacing. */}
          <DrawerContent className="bg-background text-foreground w-56 flex flex-col justify-between">
            <DrawerHeader className="space-y-0 p-0">
              <DrawerHeaderContent />
              <DrawerLinks close={close} isAdmin={isAdmin} />
            </DrawerHeader>
            <DrawerFooter className="p-0">
              <DrawerClose asChild>
                <Button
                  // Theme tokens rather than a hardcoded hex: destructive intent that still
                  // respects dark mode, sized to sit in the same rhythm as the nav rows above.
                  className="w-full justify-start gap-3 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    logout.mutate({});
                    close();
                  }}
                  variant="ghost"
                >
                  <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
                  Logout
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        // Tight on phones: smaller gap, no "or" — the two buttons speak for
        // themselves and the header has no room to spare (docs/RESPONSIVE.md).
        <div className="flex gap-2 sm:gap-4 items-center text-foreground">
          <NavLink to={"/login"}>
            <Button
              className="text-white custom-button h-8 px-3 text-sm sm:h-10 sm:px-4 sm:text-base"
              variant={"default"}
            >
              Login
            </Button>
          </NavLink>
          <span className="hidden sm:inline">or</span>
          <NavLink to={"/signup"}>
            <Button
              className="h-8 px-3 text-sm sm:h-10 sm:px-4 sm:text-base"
              variant={"outline"}
            >
              Signup
            </Button>
          </NavLink>
        </div>
      )}
    </>
  );
};
