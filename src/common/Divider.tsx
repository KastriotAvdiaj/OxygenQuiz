import React from "react";
import { cn } from "@/utils/cn";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  thickness?: string;
  color?: string;
  length?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = "horizontal",
  thickness = "1px",
  color = "var(--divider)",
  length = "100%",
  className,
}) => {
  const isHorizontal = orientation === "horizontal";
  return (
    <div
      style={{
        width: isHorizontal ? length : thickness,
        height: isHorizontal ? thickness : length,
        background: color,
        margin: isHorizontal ? `${thickness} 0` : `0 ${thickness}`,
      }}
      className={cn("bg-[var(--divider)] z-10", className)}
    />
  );
};
