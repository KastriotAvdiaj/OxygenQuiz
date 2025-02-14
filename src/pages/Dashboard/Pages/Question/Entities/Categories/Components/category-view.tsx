import { DataTable, Spinner } from "@/components/ui";

import { Card } from "@/components/ui";
import CreateQuestionCategoryForm from "./create-question-category";
import { categoryColumns } from "./columns";
import { useQuestionCategoryData } from "../api/get-question-categories";

export const CategoryView = () => {
  const questionCategoriesQuery = useQuestionCategoryData({});

  if (questionCategoriesQuery.isLoading) return <Spinner size="lg" />;
  if (questionCategoriesQuery.isError) return <p>Failed to load categories.</p>;

  return (
    <Card className="flex flex-col justify-center align-items-end gap-2 m-10 p-8 bg-background border border-border">
      <div>
        <CreateQuestionCategoryForm />
      </div>
      <DataTable
        data={questionCategoriesQuery.data || []}
        columns={categoryColumns}
      />
    </Card>
  );
};
