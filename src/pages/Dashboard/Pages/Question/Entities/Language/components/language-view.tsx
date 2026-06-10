import { Card, DataTable, Spinner } from "@/components/ui";
import { langaugeColumns } from "./columns";
import { useQuestionLanguageData } from "../api/get-question-language";
import CreateQuestionLanguageForm from "./create-question-language";
import { DataTransferControls } from "@/components/data-transfer/DataTransferControls";

export const LanguagesView = () => {
  const questionLanguagesQuery = useQuestionLanguageData({});

  if (questionLanguagesQuery.isLoading) return <Spinner size="lg" />;
  if (questionLanguagesQuery.isError) return <p>Failed to load categories.</p>;
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Languages Management</h1>
        <DataTransferControls entity="languages" invalidateKey={["getQuestionLanguages"]} />
      </div>

      <Card className="flex flex-col justify-center align-items-end gap-2  p-8 bg-background border border-border">
        <div>
          <CreateQuestionLanguageForm />
        </div>
        <DataTable
          data={questionLanguagesQuery.data || []}
          columns={langaugeColumns}
        />
      </Card>
    </>
  );
};
