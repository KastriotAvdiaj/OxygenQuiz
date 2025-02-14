import { DataTable } from "@/components/ui";

import { Card } from "@/components/ui";
import CreateQuestionDifficultyForm from "./create-question-difficulty";
import { difficultyColumns } from "./columns";
import { useQuestionDifficultyData } from "../api/get-question-difficulties";

export const DifficultyView = () => {
  const questionDifficultiesQuery = useQuestionDifficultyData({});

  if (questionDifficultiesQuery.isLoading)
    return <p>Loading difficulties...</p>;
  if (questionDifficultiesQuery.isError)
    return <p>Failed to load difficulties.</p>;

  return (
    <Card className="flex flex-col justify-center align-items-end gap-2 m-10 p-8 bg-background border border-border">
      <div>
        <CreateQuestionDifficultyForm />
      </div>
      <DataTable
        data={questionDifficultiesQuery.data || []}
        columns={difficultyColumns}
      />
    </Card>
  );
};
