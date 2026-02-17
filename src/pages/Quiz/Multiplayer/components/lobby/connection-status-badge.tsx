import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, ServerOff } from "lucide-react";
import { useConnectionStatus } from "@/hooks/use-connection-status";

export const ConnectionStatusBadge = () => {
  const connectionStatus = useConnectionStatus();

  if (connectionStatus.status === "connected") {
    return (
      <Badge
        variant="outline"
        className="px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-medium border-emerald-500 text-emerald-600 bg-emerald-500/10"
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>Connected</span>
        </div>
      </Badge>
    );
  }

  if (connectionStatus.status === "no-internet") {
    return (
      <Badge
        variant="destructive"
        className="px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-medium"
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>No Internet</span>
        </div>
      </Badge>
    );
  }

  // server-down
  return (
    <Badge
      variant="destructive"
      className="px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-medium bg-amber-500/80 hover:bg-amber-500/80"
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        <ServerOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        <span>Server Unavailable</span>
      </div>
    </Badge>
  );
};
