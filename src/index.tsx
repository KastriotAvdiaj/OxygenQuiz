import { AppProvider } from "./Provider";
import { AppRouter } from "./routes/Router";

export const App = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};
