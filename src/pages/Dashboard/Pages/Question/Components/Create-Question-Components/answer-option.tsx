import { Input } from "@/components/ui/form";
import { Switch, Button } from "@/components/ui";
import { Trash2 } from "lucide-react";

//------------------------
// Not being used
// -----------------------

export const AnswerOption = ({
  index,
  field,
  watch,
  register,
  remove,
  handleSwitchChange,
  isLast,
}: {
  index: number;
  field: any;
  watch: any;
  register: any;
  remove: (index: number) => void;
  handleSwitchChange: (index: number) => void;
  isLast: boolean;
}) => (
  <div key={field.id} className="flex items-center justify-between">
    <Input
      className={`${
        watch(`answerOptions.${index}.text`)
          ? "border-border"
          : "border-red-500"
      }`}
      placeholder={`Answer Option ${index + 1}...`}
      registration={register(`answerOptions.${index}.text`)}
    />
    <Switch
      className="shadow-md"
      id={`correct-${index}`}
      checked={watch(`answerOptions.${index}.isCorrect`)}
      onCheckedChange={() => handleSwitchChange(index)}
    />
    <Button
      variant="destructive"
      size="sm"
      className="rounded-sm"
      onClick={() => remove(index)}
      disabled={!isLast}
    >
      <Trash2 className="h-4 w-4" /> Remove
    </Button>
  </div>
);
