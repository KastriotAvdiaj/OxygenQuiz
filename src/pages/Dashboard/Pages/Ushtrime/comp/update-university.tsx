import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { useUpdateUniversity } from "../api/update-university";
import { createUniversityInputSchema } from "../api/create-university";
import { University } from "../api/get-universities";

export const UpdateUniversityForm = ({
  universityId,
  university,
}: {
  universityId: number;
  university: University;
}) => {
  const { addNotification } = useNotifications();
  const updateEmployeeMutation = useUpdateUniversity({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "University updated",
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
            universityId: universityId,
          });
        }}
        schema={createUniversityInputSchema}
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
                  defaultValue={university.name}
                  placeholder="Enter new name here..."
                  error={formState.errors["name"]}
                  registration={register("name")}
                />

                <Input
                  id="surname"
                  className={`py-2 ${
                    formState.errors["city"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  defaultValue={university.city}
                  placeholder="Enter surname here..."
                  error={formState.errors["city"]}
                  registration={register("city")}
                />
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default UpdateUniversityForm;
