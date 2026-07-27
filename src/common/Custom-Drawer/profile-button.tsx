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
      className="flex items-center rounded-md gap-2 h-8 px-2 sm:gap-2.5 sm:h-10 sm:px-3 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      {user?.username && <span className="text-xs sm:text-sm font-medium">{user.username}</span>}
      <Avatar className="cursor-pointer ring-2 ring-white shadow-sm h-6 w-6 sm:h-7 sm:w-7">
        <AvatarImage src={user?.profileImageUrl ?? undefined} alt={user?.username ?? "User"} />
        <AvatarFallback>{(user?.username?.[0] ?? "U").toUpperCase()}</AvatarFallback>
      </Avatar>
    </Button>
  );
});

ProfileButton.displayName = "ProfileButton";
  