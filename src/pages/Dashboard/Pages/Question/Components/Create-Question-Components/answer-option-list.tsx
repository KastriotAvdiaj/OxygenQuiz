import { Label } from "@/components/ui/form";
import { AnswerOption } from "./answer-option";
import { Button } from "@/components/ui";

export const AnswerOptionsList = ({
    fields,
    append,
    remove,
    watch,
    register,
    handleSwitchChange,
    errors,
  }: {
    fields: any[];
    append: (value: any) => void;
    remove: (index: number) => void;
    watch: any;
    register: any;
    handleSwitchChange: (index: number) => void;
    errors: any;
  }) => (
    <div className="space-y-4 mt-4">
      <Label className="block text-sm font-medium">Answer Options</Label>
      {fields.map((field, index) => (
        <AnswerOption
          key={field.id}
          index={index}
          field={field}
          watch={watch}
          register={register}
          remove={remove}
          handleSwitchChange={handleSwitchChange}
          isLast={fields.length > 2}
        />
      ))}
      {errors?.message && (
        <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
          {errors.message}
        </p>
      )}
      <Button
        variant="addSave"
        size="sm"
        className="mt-2 rounded-sm"
        onClick={() => append({ text: "", isCorrect: false })}
        disabled={fields.length >= 4}
      >
        + Add Answer Option
      </Button>
    </div>
  );
  