import { useConnectionStatus } from "@/hooks/use-connection-status";
import { ConnectionStatusBadgeView } from "./connection-status-badge-view";

export const ConnectionStatusBadge = () => {
  const connectionStatus = useConnectionStatus();
  return <ConnectionStatusBadgeView status={connectionStatus} />;
};
