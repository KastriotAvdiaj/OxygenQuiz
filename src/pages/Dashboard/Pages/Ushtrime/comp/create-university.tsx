import { useNotifications } from "@/common/Notifications";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import {
  createUniversityInputSchema,
  useCreateUniversity,
} from "../api/create-university";

export const CreateUniversityForm = () => {
  const { addNotification } = useNotifications();
  const createUniversityMutation = useCreateUniversity({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "University Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createUniversityMutation.isSuccess}
      triggerButton={
        <Button variant="default" size="sm" icon={<Plus className="size-4" />}>
          Create New University
        </Button>
      }
      title="Create New University"
      submitButton={
        <Button
          form="create-university"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createUniversityMutation.isPending}
          disabled={createUniversityMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-university"
        onSubmit={(values) => {
          createUniversityMutation.mutate({ data: values });
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
                  placeholder="Enter new name here..."
                  error={formState.errors["name"]}
                  registration={register("name")}
                />

                <Input
                  id="city"
                  className={`py-2 ${
                    formState.errors["city"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter city here..."
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

export default CreateUniversityForm;
