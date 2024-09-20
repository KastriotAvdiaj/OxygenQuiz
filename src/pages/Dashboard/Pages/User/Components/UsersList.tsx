import { UserItem } from "./UserItem";
import { User } from "@/types/ApiTypes";

type UsersListProps = {
  users: User[];
};

export const UsersList: React.FC<UsersListProps> = ({ users }) => {
  return (
    <ul>
      {users.map((user) => (
        <UserItem key={user.id} user={user} />
      ))}
    </ul>
  );
};
