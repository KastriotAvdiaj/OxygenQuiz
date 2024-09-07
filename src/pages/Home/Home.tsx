export const Home = () => {
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-6 bg-background text-text">
      <h1 className="text-4xl font-bold tracking-wide text-center">
        Welcome to the Quiz App!
      </h1>
      <p className="text-lg text-center max-w-lg">
        Challenge yourself with exciting quizzes and improve your knowledge.
        Click below to get started!
      </p>
      <button className="px-6 py-3 bg-add-button text-white rounded-lg hover:bg-text-hover transition-all duration-300">
        Start Quiz
      </button>
    </div>
  );
};
