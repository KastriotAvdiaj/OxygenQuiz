// Components/UserControls.tsx
// Action buttons for the Users page. Search + filtering now live in <UserFilters />.
import { RefreshCw } from "lucide-react";
import CreateUserForm from "./create-user";
import { LiftedButton } from "@/common/LiftedButton";
import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";
import type { FilterQuery } from "@/lib/filtering/types";

interface UserControlsProps {
  onRefresh: () => void;
  /** Active table filters, forwarded to export so the download matches the visible list. */
  exportQuery?: FilterQuery;
}

export const UserControls = ({ onRefresh, exportQuery }: UserControlsProps) => {
  return (
    <div className="flex items-center justify-between my-4">
        <CreateUserForm />
        <div className="flex items-center gap-2">

        <LiftedButton className="text-xs bg-background text-foreground" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </LiftedButton>
       <DataTransferControls entity="users" invalidateKey={["users"]} exportQuery={exportQuery} />
          </div>
    </div>
  );
};
