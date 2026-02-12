import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusBadgeProps {
  isConnected: boolean;
}

export const ConnectionStatusBadge = ({ isConnected }: ConnectionStatusBadgeProps) => {
  return (
    <Badge
      variant={isConnected ? "outline" : "destructive"}
      className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium transition-all ${
        isConnected
          ? "border-emerald-500 text-emerald-600 bg-emerald-500/10 animate-pulse"
          : ""
      }`}
    >
      {isConnected ? (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>Connected</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>Disconnected</span>
        </div>
      )}
    </Badge>
  );
};
