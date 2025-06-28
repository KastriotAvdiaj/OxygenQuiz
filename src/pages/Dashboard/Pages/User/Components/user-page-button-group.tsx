// Components/UserControls.tsx
import { Download, RefreshCw } from "lucide-react";
import CreateUserForm from "./create-user";
import { LiftedButton } from "@/common/LiftedButton";
import { SearchInput } from "@/lib/Search-Input";

interface UserControlsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onRefresh: () => void;
}

export const UserControls = ({
  searchTerm,
  setSearchTerm,
  onRefresh,
}: UserControlsProps) => {
  return (
    <div className="flex items-center justify-between my-4">
      <div className="flex items-center space-x-2">
        <SearchInput
          placeholder="Search users..."
          onSearch={(value) => setSearchTerm(value)}
          initialValue={searchTerm}
          className="max-w-sm"
        />
      </div>

      <div className="flex items-center space-x-2">
        <CreateUserForm />
        <LiftedButton className="text-xs" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </LiftedButton>

        <LiftedButton className="text-xs">
          <Download className="mr-2 h-4 w-4" />
          Export
        </LiftedButton>
      </div>
    </div>
  );
};
