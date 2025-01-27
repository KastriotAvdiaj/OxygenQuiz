import Header from "@/common/Header";

export const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      <div className="min-h-screen">{children}</div>
    </>
  );
};
