import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import {
  createEmployeeInputSchema,
  useCreateEmployee,
} from "../api/create-employee";

export const CreateEmployeeForm = () => {
  const { addNotification } = useNotifications();
  const createEmployeeMutation = useCreateEmployee({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Employee Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createEmployeeMutation.isSuccess}
      triggerButton={
        <Button variant="default" size="sm" icon={<Plus className="size-4" />}>
          Create New Employee
        </Button>
      }
      title="Create New Employee"
      submitButton={
        <Button
          form="create-employee"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createEmployeeMutation.isPending}
          disabled={createEmployeeMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-employee"
        onSubmit={(values) => {
          createEmployeeMutation.mutate({ data: values });
        }}
        schema={createEmployeeInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  className={`py-2 ${
                    formState.errors["name"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter new name here..."
                  error={formState.errors["name"]}
                  registration={register("name")}
                />

                <Input
                  id="surname"
                  className={`py-2 ${
                    formState.errors["surname"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter surname here..."
                  error={formState.errors["surname"]}
                  registration={register("surname")}
                />
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateEmployeeForm;
