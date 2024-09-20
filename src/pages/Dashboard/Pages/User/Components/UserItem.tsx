import { User } from "@/types/ApiTypes";

type UserItemProps = {
  user: User;
};

export const UserItem: React.FC<UserItemProps> = ({ user }) => {
  return (
    <li>
      {user.username}, {user.email}, {user.role}, {user.dateRegistered}
    </li>
  );
};
