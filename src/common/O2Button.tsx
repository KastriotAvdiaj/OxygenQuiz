import { useNavigate } from "react-router-dom";

export const O2Button = () => {
  const navigate = useNavigate();

  return (
    <h1
      className="text-7xl font-bold text-foreground cursor-pointer transform transition duration-200 ease-in-out hover:text-foreground/90 hover:scale-110"
      onClick={() => navigate("/")}
    >
      O₂
    </h1>
  );
};
