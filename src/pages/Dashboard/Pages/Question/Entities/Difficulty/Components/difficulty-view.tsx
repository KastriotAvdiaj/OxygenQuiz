import { DataTable, Spinner } from "@/components/ui";

import { Card } from "@/components/ui";
import CreateQuestionDifficultyForm from "./create-question-difficulty";
import { difficultyColumns } from "./columns";
import { useQuestionDifficultyAdminData } from "../api/get-question-difficulties-admin";
// import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const DifficultyView = () => {
  // The admin list: this table has a Created-by column, which the public list no longer
  // carries. See get-question-difficulties-admin.ts.
  const questionDifficultiesQuery = useQuestionDifficultyAdminData({});

  if (questionDifficultiesQuery.isLoading) return <Spinner size="lg" />;
  if (questionDifficultiesQuery.isError)
    return <p>Failed to load difficulties.</p>;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Difficulty Management</h1>
        {/* <DataTransferControls entity="difficulties" invalidateKey={["getQuestionDifficulties"]} /> */}
      </div>

      <Card className="flex flex-col justify-center align-items-end gap-2  p-8 bg-background border border-border">
        <div>
          <CreateQuestionDifficultyForm />
        </div>
        <DataTable
          data={questionDifficultiesQuery.data || []}
          columns={difficultyColumns}
        />
      </Card>
    </>
  );
};
