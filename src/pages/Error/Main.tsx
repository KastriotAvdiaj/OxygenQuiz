import { Button } from "@/components/ui/button";

export const MainErrorFallback = () => {
  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center text-red-500"
      role="alert"
    >
      <h2 className="text-lg font-semibold">Oops, something went wrong : </h2>
      <Button className="mt-4" onClick={() => window.location.reload()}>
        Refresh
      </Button>
    </div>
  );
};
