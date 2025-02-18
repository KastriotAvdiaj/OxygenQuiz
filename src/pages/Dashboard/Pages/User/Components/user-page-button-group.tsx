// Components/UserControls.tsx
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Search as SearchIcon } from "lucide-react";
import CreateUserForm from "./create-user";

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
        <Button variant="default" size="icon" className="rounded">
          <SearchIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <CreateUserForm />
        <Button
          variant="default"
          size="sm"
          onClick={onRefresh}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>

        <Button variant="default" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
};
