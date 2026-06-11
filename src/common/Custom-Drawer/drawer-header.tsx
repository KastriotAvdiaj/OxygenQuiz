import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Divider } from "../Divider";
import { useUser } from "@/lib/Auth";

export const DrawerHeaderContent = () => {
  const { data: user } = useUser();

  return (
    <>
      <div className="flex justify-start gap-4 items-center font-bold my-6 ">
        <Avatar className="cursor-pointer ">
          <AvatarImage src={user?.profileImageUrl ?? undefined} alt={user?.username ?? "User"} />
          <AvatarFallback>{(user?.username?.[0] ?? "U").toUpperCase()}</AvatarFallback>
        </Avatar>
        {user ? user.username : "User"}
      </div>
      <Divider orientation="horizontal" thickness="1px" length="100%" />
    </>
  );
};
