import { BesimCard } from "@/common/BesimCard";

export const Home = () => {
  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-2 justify-items-center items-center h-screen w-screen bg-background px-[10rem] gap-2">
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
      <BesimCard />
    </div>
  );
};

// import { Card } from "@/common/Card";
// import { Button } from "@/components/ui/button";
{
  /* <Card>
        <h1 className="text-4xl font-bold tracking-wide text-center">
          Welcome to the Quiz App!
        </h1>
        <p className="text-lg text-center max-w-lg">
          Challenge yourself with exciting quizzes and improve your knowledge.
          Click below to get started!
        </p>
        <Button variant="start" type="submit" className="py-5">
          Let's Play
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 19"
            className="w-8 h-8 justify-end group-hover:rotate-90 group-hover:bg-gray-50 text-gray-50 ease-linear duration-300 rounded-full border border-[var(--text-lighter)] group-hover:border-none p-2 rotate-45"
          >
            <path
              className="fill-[var(--text)] group-hover:fill-gray-800"
              d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
            ></path>
          </svg>
        </Button>
      </Card> */
}
