import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { createEmployeeInputSchema } from "../api/create-employee";
import { useUpdateEmployee } from "../api/update-employee";

export const UpdateEmployeeForm = ({ employeeId }: { employeeId: number }) => {
  const { addNotification } = useNotifications();
  const updateEmployeeMutation = useUpdateEmployee({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Employee updated",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={updateEmployeeMutation.isSuccess}
      triggerButton={
        <Button variant="default" size="sm" icon={<Plus className="size-4" />}>
          Update
        </Button>
      }
      title="Update Employee"
      submitButton={
        <Button
          form="update-employee"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={updateEmployeeMutation.isPending}
          disabled={updateEmployeeMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="update-employee"
        onSubmit={(values) => {
          updateEmployeeMutation.mutate({
            data: values,
            employeeId: employeeId,
          });
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

export default UpdateEmployeeForm;
