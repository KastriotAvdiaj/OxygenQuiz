import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui";
import { Form, FormDrawer, Input } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { createUserInputSchema, useCreateUser } from "../api/create-user";

const roleOptions = [
  { value: 1, label: "User" },
  { value: 2, label: "Admin" },
  { value: 3, label: "Superadmin" },
];

export const CreateUserForm = () => {
  const { addNotification } = useNotifications();
  const createUserMutation = useCreateUser({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "User Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createUserMutation.isSuccess}
      triggerButton={
        <Button size="sm" icon={<Plus className="size-4" />}>
          Create User
        </Button>
      }
      title="Create User"
      submitButton={
        <Button
          form="create-user"
          type="submit"
          size="sm"
          isPending={createUserMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-user"
        onSubmit={(values) => {
          createUserMutation.mutate({ data: values });
        }}
        schema={createUserInputSchema}
      >
        {({ register, formState, setValue }) => (
          <>
            {/* Username Field */}
            <Input
              label="Username"
              error={formState.errors["username"]}
              registration={register("username")}
            />

            {/* Email Field */}
            <Input
              label="Email"
              type="email"
              error={formState.errors["email"]}
              registration={register("email")}
            />

            {/* Password Field */}
            <Input
              label="Password"
              type="password"
              error={formState.errors["password"]}
              registration={register("password")}
            />

            {/* Role Dropdown */}
            <Select/>
          </>
        )}
      </Form>
    </FormDrawer>
  );
};

export default CreateUserForm;
