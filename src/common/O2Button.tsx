import { useNavigate } from "react-router-dom";

/**
 * The O₂ wordmark. Sets `font-quiz` explicitly rather than inheriting it, so the logo renders
 * identically on every page that uses it — Login used to wrap it in `font-header` while Signup
 * didn't, which is exactly how the two drifted apart.
 *
 * font-quiz matches the rest of the auth pages and the "OXYGEN" wordmark in the header
 * (src/common/Header.tsx). Note it resolves to `var(--font-quiz)`, a user-selectable setting,
 * so the logo follows the visitor's chosen quiz font; switch to `font-header` if the wordmark
 * should be pinned to one typeface instead.
 */
export const O2Button = () => {
  const navigate = useNavigate();

  return (
    <h1
      className="font-quiz text-4xl sm:text-5xl lg:text-7xl font-bold text-white cursor-pointer transform transition duration-200 ease-in-out hover:scale-110"
      onClick={() => navigate("/")}
    >
      O₂
    </h1>
  );
};
