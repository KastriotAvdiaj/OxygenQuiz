import { Card, DataTable, Spinner } from "@/components/ui";
import { langaugeColumns } from "./columns";
import { useQuestionLangaugeData } from "../api/get-question-languages";

export const LangaugesView = () => {
  const questionLanguagesQuery = useQuestionLangaugeData({});

  if (questionLanguagesQuery.isLoading) return <Spinner size="lg" />;
  if (questionLanguagesQuery.isError) return <p>Failed to load categories.</p>;
  return (
    <Card className="flex flex-col justify-center align-items-end gap-2 m-10 p-8 bg-background border border-border">
      <DataTable
        data={questionLanguagesQuery.data || []}
        columns={langaugeColumns}
      />
    </Card>
  );
};
