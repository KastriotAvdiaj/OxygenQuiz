import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateUser,
  CreateUserInput,
  createUserInputSchema,
} from "../api/create-user";
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/index";
import { useState } from "react";

const roleOptions = [
  { value: 1, label: "User" },
  { value: 2, label: "Admin" },
  { value: 3, label: "Superadmin" },
];

const CreateUserForm = () => {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const { mutate: createUser, isPending } = useCreateUser();

  // Form validation using zod schema
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserInputSchema),
  });

  const onSubmit = (data: CreateUserInput) => {
    // Adding the selected role to form data before mutation
    data.role = selectedRole!;
    createUser({ data });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg space-y-4"
    >
      <h2 className="text-2xl font-bold mb-4">Create New User</h2>

      {/* Username Field */}
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Enter username"
          {...register("username")}
          className="mt-1"
        />
        {errors.username && (
          <p className="text-red-600 text-sm">{errors.username.message}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email"
          {...register("email")}
          className="mt-1"
        />
        {errors.email && (
          <p className="text-red-600 text-sm">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter password"
          {...register("password")}
          className="mt-1"
        />
        {errors.password && (
          <p className="text-red-600 text-sm">{errors.password.message}</p>
        )}
      </div>

      {/* Role Dropdown */}
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          onValueChange={(value: string) => {
            setSelectedRole(Number(value));
            setValue("role", Number(value));
          }}
        >
          <SelectTrigger id="role" className="mt-1">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role.value} value={String(role.value)}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-red-600 text-sm">{errors.role.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} isPending={isPending}>
          Create User
        </Button>
      </div>
    </form>
  );
};

export default CreateUserForm;
