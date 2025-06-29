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
    className="flex items-center rounded-[2rem] gap-3 py-2 h-12 px-4 text-white"
  >
    My Profile
    <Avatar className="cursor-pointer">
      <AvatarImage src="https://github.com/shadcn.png" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  </Button>
));

ProfileButton.displayName = "ProfileButton";
