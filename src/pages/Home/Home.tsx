import BackgroundPaths from "@/common/background-path";

export const Home = () => {
  return (
    <div className="relative min-h-screen w-screen overflow-hidden">
      <BackgroundPaths title="Oxygen Quiz" />
      {/* <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 justify-items-center items-center h-screen w-screen gap-2">
        <div className="space-y-6 text-center lg:text-left">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground">
            Welcome to <br />
            <span className="bg-gradient-to-r from-foreground/50 via- to-purple-500 bg-clip-text text-transparent">
              Oxygen Quiz!
            </span>
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-foreground">
            Test your knowledge and{" "}
            <span className="text-foreground font-semibold">improve</span> your
            skills!
          </p>
          <button className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
            Get Started
          </button>
        </div>
        {/* <BesimCard /> */}
      {/* </div> */}
    </div>
  );
};
