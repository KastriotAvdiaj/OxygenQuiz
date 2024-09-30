import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form";
import { NewQuestion } from "./Components/create-question";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui";
import { columns } from "./Components/columns";

export const Questions = () => {
  return (
    <div>
      <FormDrawer
      isDone={false}
      triggerButton={
        <Button
          variant="addSave"
          className="bg-text-hover rounded-sm"
          size="sm"
          icon={<Plus className="size-4" />}
        >
          Create Question
        </Button>
      }
      title="Create Question"
      submitButton={
        <Button
          form="create-user"
          variant="addSave"
          className="rounded-sm"
          type="submit"
          size="default"
          isPending={true}
          disabled={false}
        >
          Submit
        </Button>
      }
    >
      <NewQuestion />
    </FormDrawer>
      <DataTable columns={columns} data={[]} />
    </div>
  );
};
