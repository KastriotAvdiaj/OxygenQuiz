// Components/UserControls.tsx
import { Input } from "@/components/ui/form";
import { Download, RefreshCw, Search as SearchIcon } from "lucide-react";
import CreateUserForm from "./create-user";
import { LiftedButton } from "@/common/LiftedButton";

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
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <LiftedButton variant="icon" className="rounded-xl">
          <SearchIcon size={16} className="mx-1"/>
        </LiftedButton>
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
