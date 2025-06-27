import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { LiftedButton } from "./LiftedButton";
import { Button } from "@/components/ui";

interface BackButtonProps {
  className?: string;
  variant?: "default" | "normal" | "fancy";
}

export const GoBackButton: React.FC<BackButtonProps> = ({
  className,
  variant = "default",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (location.pathname.includes("redirect")) {
      navigate(-2);
    } else {
      navigate(-1);
    }
  };

  if (variant === "normal") {
    return (
      <LiftedButton
        onClick={goBack}
        className={cn("bg-primary text-white rounded-md", className)}
      >
        Go Back
      </LiftedButton>
    );
  }

  if (variant === "fancy") {
    return (
      <Button variant={"fancy"} onClick={goBack}>
        Go Back
      </Button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "bg-muted shadow-md text-center w-48 rounded-xl h-9 font-sans relative text-foreground text-sm font-semibold group",
        className
      )}
      onClick={goBack}
    >
      <div className="bg-primary rounded-xl h-7 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[184px] z-10 duration-500">
        <svg
          width="25px"
          height="25px"
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="white"
            d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
          ></path>
          <path
            fill="white"
            d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
          ></path>
        </svg>
      </div>
      <p className="translate-x-2 text-foreground">Go Back</p>
    </button>
  );
};
