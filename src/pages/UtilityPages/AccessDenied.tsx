import { Link } from "react-router-dom";
import { Home, Lock } from "lucide-react";
import { ErrorAction, ErrorBadge, ErrorScreen } from "./Error-Screen";

/** `/access-denied`: where a permission loader sends someone without the right role. */
export const AccessDeniedPage = () => (
  <ErrorScreen
    hero={<ErrorBadge icon={Lock} />}
    title="Access denied"
    message="You don't have permission to view this page. If you think that's a mistake, ask an administrator."
    actions={
      <Link to="/" tabIndex={-1}>
        <ErrorAction>
          <Home className="h-4 w-4 sm:h-5 sm:w-5" />
          Back home
        </ErrorAction>
      </Link>
    }
  />
);
