import { useNavigate } from "react-router-dom";

/**
 * The O₂ wordmark. Owns its own `font-header` on purpose: it is a logo, so it must look
 * identical everywhere and must NOT inherit the surrounding font. Both auth pages set
 * `font-quiz` on their root, which resolves to `var(--font-quiz)` — a *user-selectable* setting
 * — so an inherited logo would change typeface per visitor. Login previously pinned this with a
 * `font-header` wrapper and Signup didn't, which is exactly how the two drifted apart.
 */
export const O2Button = () => {
  const navigate = useNavigate();

  return (
    <h1
      className="font-header text-4xl sm:text-5xl lg:text-7xl font-bold text-white cursor-pointer transform transition duration-200 ease-in-out hover:scale-110"
      onClick={() => navigate("/")}
    >
      O₂
    </h1>
  );
};
