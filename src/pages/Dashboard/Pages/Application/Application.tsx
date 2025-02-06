export const Application = () => {
  return (
    <div className="grid grid-rows-3 gap-10 h-full px-20 py-10">
      {" "}
      <div className="grid grid-cols-3 gap-8 ">
        <div className="bg-[var(--muted)] w-full"></div>
        <div className="bg-[var(--muted)] w-full"></div>
        <div className="bg-[var(--muted)] w-full "></div>
      </div>
      <div className="w-full bg-[var(--muted)]"></div>
      <div className="bg-[var(--muted)] w-full h-[2000px]"></div>
    </div>
  );
};
