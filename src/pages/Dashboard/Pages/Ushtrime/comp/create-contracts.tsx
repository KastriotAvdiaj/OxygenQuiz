import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import {
  createContractsInputSchema,
  useCreateContracts,
} from "../api/create-contracts";
import { useEmployeeData } from "../api/get-employees";

export const CreateContractsForm = () => {
  const { addNotification } = useNotifications();
  const createContractsMutation = useCreateContracts({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Contract Created",
        });
      },
    },
  });

  const employees = useEmployeeData({});

  return (
    <FormDrawer
      isDone={createContractsMutation.isSuccess}
      triggerButton={
        <Button variant="default" size="sm" icon={<Plus className="size-4" />}>
          Create New Contact
        </Button>
      }
      title="Create New Contact"
      submitButton={
        <Button
          form="create-contact"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createContractsMutation.isPending}
          disabled={createContractsMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-contact"
        onSubmit={(values) => {
          createContractsMutation.mutate({ data: values });
        }}
        schema={createContractsInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  className={`py-2 ${
                    formState.errors["title"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter new name here..."
                  error={formState.errors["title"]}
                  registration={register("title")}
                />
                <Input
                  id="description"
                  className={`py-2 ${
                    formState.errors["description"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter description here..."
                  error={formState.errors["description"]}
                  registration={register("description")}
                />
                <Label htmlFor="employeeId" className="text-sm font-medium">
                  Employee
                </Label>
                <select
                  id="employeeId"
                  {...register("employeeId", { valueAsNumber: true })}
                >
                  {employees.data &&
                    employees.data.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateContractsForm;
