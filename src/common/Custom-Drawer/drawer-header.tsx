import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Divider } from "../Divider";

export const DrawerHeaderContent = () => (
  <>
    <div className="flex justify-start gap-4 items-center font-bold mb-6 ">
      <Avatar className="cursor-pointer ">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      Username
    </div>
    <Divider orientation="horizontal" thickness="1px" length="100%" />
  </>
);
