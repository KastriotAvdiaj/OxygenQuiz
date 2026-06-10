// Components/UserControls.tsx
// Action buttons for the Users page. Search + filtering now live in <UserFilters />.
import { Download, RefreshCw } from "lucide-react";
import CreateUserForm from "./create-user";
import { LiftedButton } from "@/common/LiftedButton";

interface UserControlsProps {
  onRefresh: () => void;
}

export const UserControls = ({ onRefresh }: UserControlsProps) => {
  return (
    <div className="flex items-center justify-end my-4">
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
