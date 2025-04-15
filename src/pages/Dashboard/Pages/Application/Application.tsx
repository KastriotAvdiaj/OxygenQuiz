// import { useDrejtimiData } from "../Ushtrime/api/get-drejtimi";
// import { useUniversityData } from "../Ushtrime/api/get-universities";
// import { CreateDrejtimiForm } from "../Ushtrime/comp/create-drejtimi";
// import { CreateUniversityForm } from "../Ushtrime/comp/create-university";
// import { DeleteDrejtimi } from "../Ushtrime/comp/delete-drejtimi";
// import { DeleteUniversity } from "../Ushtrime/comp/delete-university";
// import { UpdateUniversityForm } from "../Ushtrime/comp/update-university";

export const Application = () => {
  // const Universities = useUniversityData({});
  // const contracts = useDrejtimiData({});

  return (
    <div className="p-4 space-y-8">
      {/* Universities Table */}
      {/* <div>
        <h2 className="text-xl font-bold mb-2">Universities</h2>
        {Universities.isLoading ? (
          <p>Loading Universities...</p>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">City</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Universities.data?.map((university) => (
                <tr key={university.id || university.name}>
                  <td className="border border-gray-300 px-4 py-2">
                    {university.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {university.city}
                  </td>
                  <td>
                    <UpdateUniversityForm
                      universityId={university.id}
                      university={university}
                    />
                    <DeleteUniversity id={university.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Drejtimi</h2>
        {contracts.isLoading ? (
          <p>Loading drejtimet...</p>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Duration</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.data?.map((contract) => (
                <tr key={contract.id}>
                  <td className="border border-gray-300 px-4 py-2">
                    {contract.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {contract.duration}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <DeleteDrejtimi id={contract.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div> */}

      {/* Forms Section */}
      {/* <div className="space-y-4">
        <CreateUniversityForm />
        <CreateDrejtimiForm />
      </div> */}
    </div>
  );
};

export default Application;
