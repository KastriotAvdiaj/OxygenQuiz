// import { BesimCard } from "@/common/BesimCard";

export const Home = () => {
  return (
    <div
      className="relative 
 grid grid-cols-1 lg:grid-cols-2 justify-items-center items-center h-screen w-screen  gap-2"
    >
      <div className="relative z-10 space-y-6 ">
        <h1 className="text-5xl md:text-6xl lg:text-7xl  font-bold text-[var(--text)]">
          Welcome to <br />{" "}
          <span className="bg-gradient-to-r from-[var(--text-hover)] via- to-purple-500  bg-clip-text text-transparent">
            Oxygen Quiz!
          </span>
        </h1>
        <p className="text-xl md:text-2xl lg:text-3xl text-[var(--text)]">
          Test your knowledge and{" "}
          <span className="text-[var(--text-hover)] font-semibold">
            {" "}
            improve
          </span>{" "}
          your skills!
        </p>
        <button className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg">
          Get Started
        </button>
      </div>
      {/* <BesimCard /> */}
    </div>
  );
};
