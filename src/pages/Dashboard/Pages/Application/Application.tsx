export const Application = () => {
  return (
    <div className="bg-muted grid grid-rows-3 gap-10 h-full">
      {" "}
      <div className="grid grid-cols-3 gap-8 ">
        <div className="bg-background w-full"></div>
        <div className="bg-background w-full"></div>
        <div className="bg-background w-full "></div>
      </div>
      <div className="w-full bg-background"></div>
      <div className="bg-background w-full h-[2000px]"></div>
    </div>
  );
};
