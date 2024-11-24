import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui";
import { Form, FormDrawer, Input } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { createUserInputSchema, useCreateUser } from "../api/create-user";

const roleOptions = [
  { label: "User" },
  { label: "Admin" },
  { label: "Superadmin" },
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
        <Button
          variant="default"
          className="bg-background"
          size="sm"
          icon={<Plus className="size-4" />}
        >
          Create User
        </Button>
      }
      title="Create User"
      submitButton={
        <Button
          form="create-user"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createUserMutation.isPending}
          disabled={createUserMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-user"
        className="w-[300px]"
        onSubmit={(values) => {
          const role = values.role || "User";
          createUserMutation.mutate({
            data: { ...values, role: role },
          });
        }}
        schema={createUserInputSchema}
      >
        {({ register, formState, setValue }) => (
          <>
            <Input
              placeholder="Username..."
              label="Username"
              error={formState.errors["username"]}
              registration={register("username")}
            />

            <Input
              placeholder="Email..."
              label="Email"
              type="email"
              error={formState.errors["email"]}
              registration={register("email")}
            />
            <Input
              placeholder="Password..."
              label="Password"
              type="password"
              error={formState.errors["password"]}
              registration={register("password")}
            />

            <div className="flex flex-col space-y-1.5">
              <label htmlFor="role">Role</label>
              <Select onValueChange={(value) => setValue("role", value)}>
                <SelectTrigger id="role" className="border-gray-400">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer bg-[var(--background-secondary)]">
                  {roleOptions.map((role, index) => (
                    <SelectItem
                      key={index}
                      value={role.label}
                      className="cursor-pointer hover:!bg-[var(--background)]"
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </Form>
    </FormDrawer>
  );
};

export default CreateUserForm;
