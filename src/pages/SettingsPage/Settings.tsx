export const Settings = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[var(--background-primary)] ">
      <div className="bg-[var(--background-secondary)] h-full w-[60%] p-8 overflow-y-auto mt-20">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <button className="bg-blue-500 text-white px-4 py-2 rounded mb-2 w-full">
            Change Username
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded mb-2 w-full">
            Change Password
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded w-full">
            Update Email
          </button>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Preferences</h2>
          <div className="flex items-center justify-between mb-2">
            <span>Dark Mode</span>
            <input type="checkbox" className="toggle" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span>Sound Effects</span>
            <input type="checkbox" className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <span>Show Timer</span>
            <input type="checkbox" className="toggle" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quiz Settings</h2>
          <div className="mb-2">
            <label className="block mb-1">Default Difficulty</label>
            <select className="w-full p-2 rounded border">
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Questions per Quiz</label>
            <input
              type="number"
              min="5"
              max="50"
              className="w-full p-2 rounded border"
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          <button className="bg-red-500 text-white px-4 py-2 rounded mb-2 w-full">
            Clear Quiz History
          </button>
          <button className="bg-red-500 text-white px-4 py-2 rounded w-full">
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
};
