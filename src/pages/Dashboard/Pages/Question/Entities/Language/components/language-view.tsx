import { Card, DataTable, Spinner } from "@/components/ui";
import { langaugeColumns } from "./columns";
import { useQuestionLanguageData } from "../api/get-question-language";
import CreateQuestionLanguageForm from "./create-question-language";

export const LanguagesView = () => {
  const questionLanguagesQuery = useQuestionLanguageData({});

  if (questionLanguagesQuery.isLoading) return <Spinner size="lg" />;
  if (questionLanguagesQuery.isError) return <p>Failed to load categories.</p>;
  return (
    <Card className="flex flex-col justify-center align-items-end gap-2  p-8 bg-background border border-border">
      <div>
        <CreateQuestionLanguageForm />
      </div>
      <DataTable
        data={questionLanguagesQuery.data || []}
        columns={langaugeColumns}
      />
    </Card>
  );
};
