import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/Auth";
import formatDate from "@/lib/date-format";
import { User } from "@/types/ApiTypes";

const MyProfile = () => {
  const Data = useUser();
  const user: User = Data.data;
  console.log(user);

  const initials =
    typeof user.username === "string"
      ? user.username
          .split(" ")
          .map((name: string) => name[0])
          .join("")
          .toUpperCase()
      : "?";

  return (
    <div className="pt-20">
      <Card className="max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.profileImageUrl} alt={user.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <CardTitle className="text-xl">{user.username}</CardTitle>
            <Badge variant="outline" className="w-fit mt-1">
              {user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1 text-sm">
              <span className="font-medium">Email:</span>
              <span className="col-span-2">{user.email}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-sm">
              <span className="font-medium">Registered:</span>
              <span className="col-span-2">
                {formatDate(user.dateRegistered)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-sm">
              <span className="font-medium">Last login:</span>
              <span className="col-span-2">{formatDate(user.lastLogin)}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-sm">
              <span className="font-medium">Last updated:</span>
              <span className="col-span-2">
                {formatDate(user.userUpdatedAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default MyProfile;
