import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileButtonProps = {
  onClick?: () => void;
};

export const ProfileButton = React.forwardRef<
  HTMLButtonElement,
  ProfileButtonProps
>(({ onClick }, ref) => (
  <Button
    ref={ref}
    onClick={onClick}
    variant={"default"}
    size={"none"}
    className="flex items-center rounded-[2rem] gap-3 py-2 h-12 px-4 shadow-[2px_2px_10px_0px_rgba(0,0,0,0.5)] hover:ring-1 hover:ring-[var(--border)]"
  >
    My Profile
    <Avatar className="cursor-pointer">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  </Button>
));

ProfileButton.displayName = "ProfileButton";
