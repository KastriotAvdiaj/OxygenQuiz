import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useUser } from "@/lib/Auth";
import { useDeleteUser } from "../api/delete-user";
import { UserX } from "lucide-react";

type DeleteUserProps = {
  id: string;
  closeDropDown: () => void;
};

export const DeleteUser = ({ id, closeDropDown }: DeleteUserProps) => {
  const user = useUser();
  const { addNotification } = useNotifications();
  const deleteUserMutation = useDeleteUser({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "User Deleted",
        });
        closeDropDown();
      },
    },
  });

  if (user.data?.id === id)
    return (
      <Button
        className="gap-2 h-5 font-normal px-0 bg-muted hover:bg-muted"
        disabled
      >
        <UserX size={16} /> Delete User
      </Button>
    );

  return (
    <ConfirmationDialog
      isDone={deleteUserMutation.isSuccess}
      icon="danger"
      title="Delete User"
      body="Are you sure you want to delete this user?"
      triggerButton={
        <Button variant="userMenu" className="h-5 font-normal px-0">
          <UserX size={16} /> Delete User
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteUserMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            console.log("Deleting user with ID:", id);
            deleteUserMutation.mutate({ userId: id });
          }}
        >
          Delete User
        </Button>
      }
    />
  );
};
