import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/Auth";

type ProfileButtonProps = {
  onClick?: () => void;
};

export const ProfileButton = React.forwardRef<
  HTMLButtonElement,
  ProfileButtonProps
>(({ onClick }, ref) => {
  const { data: user } = useUser();

  return (
    <Button
      ref={ref}
      onClick={onClick}
      variant={"default"}
      size={"none"}
      className="flex items-center rounded-[2rem] gap-3 py-2 h-12 px-4 text-white"
    >
      My Profile
      <Avatar className="cursor-pointer">
        <AvatarImage src={user?.profileImageUrl ?? undefined} alt={user?.username ?? "User"} />
        <AvatarFallback>{(user?.username?.[0] ?? "U").toUpperCase()}</AvatarFallback>
      </Avatar>
    </Button>
  );
});

ProfileButton.displayName = "ProfileButton";
