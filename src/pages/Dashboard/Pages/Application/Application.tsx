import { useContractsData } from "../Ushtrime/api/get-contracts";
import { useEmployeeData } from "../Ushtrime/api/get-employees";
import CreateContractsForm from "../Ushtrime/comp/create-contracts";
import CreateEmployeeForm from "../Ushtrime/comp/create-employee";
import { DeleteContract } from "../Ushtrime/comp/delete-contracts";
import UpdateEmployeeForm from "../Ushtrime/comp/update-employee";

export const Application = () => {
  const employees = useEmployeeData({});
  const contracts = useContractsData({});
  console.log(employees, contracts);

  return (
    <div className="p-4 space-y-8">
      {/* Employees Table */}
      <div>
        <h2 className="text-xl font-bold mb-2">Employees</h2>
        {employees.isLoading ? (
          <p>Loading employees...</p>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Surname</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.data?.map((employee) => (
                <tr key={employee.id || employee.name}>
                  <td className="border border-gray-300 px-4 py-2">
                    {employee.name}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {employee.surname}
                  </td>
                  <td>
                    <UpdateEmployeeForm employeeId={employee.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contracts Table */}
      <div>
        <h2 className="text-xl font-bold mb-2">Contracts</h2>
        {contracts.isLoading ? (
          <p>Loading contracts...</p>
        ) : (
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-4 py-2">Title</th>
                <th className="border border-gray-300 px-4 py-2">
                  Description
                </th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.data?.map((contract) => (
                <tr key={contract.id}>
                  <td className="border border-gray-300 px-4 py-2">
                    {contract.title}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {contract.description}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {/* <button
                      onClick={() => {
                        deleteContract({ contractId: contract.id });
                      }}
                      className="text-red-500"
                    >
                      delete
                    </button> */}
                    <DeleteContract id={contract.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Forms Section */}
      <div className="space-y-4">
        <CreateEmployeeForm />
        <CreateContractsForm />
      </div>
    </div>
  );
};

export default Application;
