import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { useNotifications } from "@/common/Notifications";
import { useDeleteUser } from "../api/delete-user";
import { UserX } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";

type DeleteUserProps = {
  id: string;
  closeDropDown: () => void;
};

export const DeleteUser = ({ id, closeDropDown }: DeleteUserProps) => {
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

  return (
    <ConfirmationDialog
      isDone={deleteUserMutation.isSuccess}
      icon="danger"
      title="Delete User"
      body="Are you sure you want to delete this user?"
      triggerButton={
        <Button variant="userMenu" className="h-5 font-normal px-0 flex">
          <UserX size={16} /> Delete User
        </Button>
      }
      confirmButton={
        <LiftedButton
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-1"
          liftColor="red-700"
          isPending={deleteUserMutation.isPending}
          type="button"
          onClick={() => {
            console.log("Deleting user with ID:", id);
            deleteUserMutation.mutate({ userId: id });
          }}
        >
          Delete User
        </LiftedButton>
      }
    />
  );
};
