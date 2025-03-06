import { useNotifications } from "@/common/Notifications";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { Trash2 } from "lucide-react";
import { useDeleteContract } from "../api/delete-contracts";

type DeleteContractProp = {
  id: number;
};
export const DeleteContract = ({ id }: DeleteContractProp) => {
  const { addNotification } = useNotifications();
  const deleteContractMutation = useDeleteContract({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Contract Deleted",
        });
      },
    },
  });

  return (
    <ConfirmationDialog
      isDone={deleteContractMutation.isSuccess}
      icon="danger"
      title="Delete Contract"
      body="This action cannot be undone."
      triggerButton={
        <Button className="rounded-xl">
          <Trash2 size={16} />
        </Button>
      }
      confirmButton={
        <Button
          isPending={deleteContractMutation.isPending}
          type="button"
          variant="destructive"
          onClick={() => {
            deleteContractMutation.mutate({ contractId: id });
          }}
        >
          Delete Contract
        </Button>
      }
    />
  );
};
