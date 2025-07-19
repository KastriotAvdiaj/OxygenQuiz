import { useEffect, useMemo } from 'react';

export interface CategoryColorPalette {
  colors: string[];
  gradient: boolean;
}

export interface QuizThemeConfig {
  categoryId?: number;
  colorPalette?: CategoryColorPalette;
  primaryColor?: string;
}

/**
 * Hook for managing quiz theme based on category color palette
 */
export function useQuizTheme(config: QuizThemeConfig = {}) {
  const theme = useMemo(() => {
    const { colorPalette, primaryColor } = config;
    
    // Default theme colors
    let primary = primaryColor || '#6366f1';
    let secondary = '#8b5cf6';
    let accent = '#06b6d4';
    
    // If we have a color palette, use it
    if (colorPalette?.colors && colorPalette.colors.length > 0) {
      primary = colorPalette.colors[0];
      secondary = colorPalette.colors[1] || colorPalette.colors[0];
      accent = colorPalette.colors[2] || colorPalette.colors[1] || colorPalette.colors[0];
    }
    
    return {
      primary,
      secondary,
      accent,
      gradient: colorPalette?.gradient ?? false,
      colors: colorPalette?.colors || [primary],
      // Generate CSS custom properties
      cssVars: {
        '--quiz-theme-primary': primary,
        '--quiz-theme-secondary': secondary,
        '--quiz-theme-accent': accent,
        '--quiz-theme-primary-rgb': hexToRgb(primary),
        '--quiz-theme-secondary-rgb': hexToRgb(secondary),
        '--quiz-theme-accent-rgb': hexToRgb(accent),
      } as React.CSSProperties,
      // Generate gradient backgrounds
      gradients: {
        primary: colorPalette?.gradient 
          ? `linear-gradient(135deg, ${colorPalette.colors.join(', ')})`
          : `linear-gradient(135deg, ${primary}, ${secondary})`,
        subtle: `linear-gradient(135deg, ${primary}15, ${primary}05)`,
        card: `linear-gradient(135deg, ${primary}08, ${secondary}08)`,
      }
    };
  }, [config.colorPalette, config.primaryColor]);

  // Apply theme to document root when theme changes
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Cleanup on unmount
    return () => {
      Object.keys(theme.cssVars).forEach(property => {
        root.style.removeProperty(property);
      });
    };
  }, [theme.cssVars]);

  return theme;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241'; // Default blue RGB
  
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ].join(', ');
}

/**
 * Generate a complementary color palette from a base color
 */
export function generateComplementaryPalette(baseColor: string): string[] {
  // This is a simplified version - you could use a more sophisticated color theory library
  const hsl = hexToHsl(baseColor);
  if (!hsl) return [baseColor];
  
  const [h, s, l] = hsl;
  
  return [
    baseColor, // Original
    hslToHex((h + 30) % 360, s, Math.min(l + 10, 100)), // Analogous
    hslToHex((h + 180) % 360, s, l), // Complementary
    hslToHex((h + 60) % 360, Math.max(s - 20, 0), l), // Triadic
  ];
}

function hexToHsl(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}