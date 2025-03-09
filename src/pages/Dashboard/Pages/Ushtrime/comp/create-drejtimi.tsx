import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import {
  createDrejtimiInputSchema,
  useCreateDrejtimi,
} from "../api/create-drejtimi";
import { useUniversityData } from "../api/get-universities";

export const CreateDrejtimiForm = () => {
  const { addNotification } = useNotifications();
  const createContractsMutation = useCreateDrejtimi({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Drejtimi Created",
        });
      },
    },
  });

  const employees = useUniversityData({});

  return (
    <FormDrawer
      isDone={createContractsMutation.isSuccess}
      triggerButton={
        <Button variant="default" size="sm" icon={<Plus className="size-4" />}>
          Create New Drejtim
        </Button>
      }
      title="Create New Drejtim"
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
        schema={createDrejtimiInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="title"
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
                  id="description"
                  className={`py-2 ${
                    formState.errors["duration"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter duration here..."
                  error={formState.errors["duration"]}
                  registration={register("duration")}
                />
                <Label htmlFor="universityId" className="text-sm font-medium">
                  Employee
                </Label>
                <select
                  id="universityId"
                  {...register("universityId", { valueAsNumber: true })}
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

export default CreateDrejtimiForm;
