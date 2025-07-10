"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";  

interface ColorCardProps {
  /**
   * Color palette - accepts either JSON string from backend or array of hex strings
   */
  colorPalette: string | string[];
  /**
   * Whether to use gradient background
   */
  gradient?: boolean;
  /**
   * Size variant for different use cases
   */
  size?: "sm" | "md" | "lg";
  /**
   * Whether to show hover animations
   */
  animated?: boolean;
  /**
   * Whether to show the rotating border animation
   */
  borderAnimation?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
  /**
   * Content to render inside the card
   */
  children?: React.ReactNode;
  /**
   * Mouse event handlers
   */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

export function ColorCard({
  colorPalette,
  gradient = false,
  size = "md",
  animated = true,
  borderAnimation = true,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: ColorCardProps) {
  // Parse color palette to standardized format
  const colors = React.useMemo(() => {
    try {
      if (typeof colorPalette === "string") {
        const parsed = JSON.parse(colorPalette);
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : ["#6366f1", "#8b5cf6", "#06b6d4"];
      }
      return Array.isArray(colorPalette) && colorPalette.length > 0
        ? colorPalette
        : ["#6366f1", "#8b5cf6", "#06b6d4"];
    } catch (error) {
      console.warn("Failed to parse colorPalette:", error);
      return ["#6366f1", "#8b5cf6", "#06b6d4"];
    }
  }, [colorPalette]);

  // Helper function to convert hex to rgba
  const hexToRgba = React.useCallback((hex: string, alpha: number) => {
    const bigint = parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  // Generate styling values
  const { mainColor, borderGradient, backgroundStyle } = React.useMemo(() => {
    const main = colors[0];
    const border = colors.join(", ");
    const bg = gradient && colors.length > 1
      ? `linear-gradient(135deg, ${colors.map(hex => hexToRgba(hex, 0.4)).join(", ")})`
      : `${main}60`;
    
    return {
      mainColor: main,
      borderGradient: border,
      backgroundStyle: bg,
    };
  }, [colors, gradient, hexToRgba]);

  // Size variants
  const sizeClasses = {
    sm: "min-h-[120px] sm:min-h-[140px]",
    md: "min-h-[160px] sm:min-h-[180px] md:min-h-[200px]",
    lg: "min-h-[180px] sm:min-h-[200px] md:min-h-[220px]",
  };

  const CardComponent = animated ? motion.div : "div";
  const InnerComponent = borderAnimation ? motion.div : "div";

  const animationProps = animated
    ? {
        whileHover: {
          scale: 1.02,
          y: -2,
        },
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 25,
          duration: 0.2,
        },
      }
    : {};

  const borderAnimationProps = borderAnimation
    ? {
        animate: {
          "--border-angle": ["0deg", "360deg"],
        },
        transition: {
          duration: 4,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        },
      }
    : {};

  return (
    <CardComponent
      className={cn(
        "h-full w-full rounded-lg",
        onClick && "cursor-pointer",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      {...animationProps}
    >
      <InnerComponent
        className="relative h-full rounded-lg"
        style={
          borderAnimation
            ? ({
                "--border-colors": borderGradient,
              } as React.CSSProperties)
            : undefined
        }
        {...borderAnimationProps}
      >
        <Card
          className={cn(
            "relative h-full flex flex-col overflow-hidden rounded-lg justify-center items-center",
            "transition-all duration-300 shadow-md backdrop-blur-sm",
            borderAnimation ? "border-4" : "border-2",
            sizeClasses[size]
          )}
          style={{
            background: backgroundStyle,
            ...(borderAnimation && {
              borderImage: `conic-gradient(from var(--border-angle, 0deg), ${borderGradient}, ${colors[0]}) 1`,
              borderImageSlice: 1,
            }),
            ...(!borderAnimation && {
              borderColor: mainColor,
            }),
          }}
        >
          {children}
        </Card>
      </InnerComponent>
    </CardComponent>
  );
}