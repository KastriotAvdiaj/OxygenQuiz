import React from "react";
import { AnswerOption } from "@/types/ApiTypes";
import { Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Label } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface AnswerOptionListProps {
  options: AnswerOption[];
  onUpdate?: (updatedOptions: AnswerOption[]) => void;
  isEditing?: boolean;
}

export const AnswerOptionList: React.FC<AnswerOptionListProps> = ({
  options,
  onUpdate,
  isEditing = false,
}) => {
  const handleOptionChange = (
    index: number,
    field: keyof AnswerOption,
    value: any
  ) => {
    if (onUpdate) {
      const updatedOptions = [...options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      onUpdate(updatedOptions);
    }
  };

  const handleAddOption = () => {
    if (onUpdate) {
      const newOption: AnswerOption = {
        id: Date.now(),
        text: "",
        isCorrect: false,
      };
      onUpdate([...options, newOption]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (onUpdate) {
      const updatedOptions = options.filter((_, i) => i !== index);
      onUpdate(updatedOptions);
    }
  };

  return (
    <div className="space-y-4">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center bg-background-secondary p-4 justify-between space-x-4">
          {isEditing ? (
            <>
              <div className="flex items-center space-x-4">
                <Input
                  value={option.text}
                  onChange={(e) =>
                    handleOptionChange(index, "text", e.target.value)
                  }
                  className="flex-grow"
                />
                <div className="flex items-center space-x-3">
                  <Switch
                    className="border-text-hover"
                    checked={option.isCorrect}
                    onCheckedChange={(checked) =>
                      handleOptionChange(index, "isCorrect", checked)
                    }
                  />
                  <Label>Correct</Label>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => handleRemoveOption(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-grow">{option.text}</span>
              {option.isCorrect ? (
                <Check className="text-green-500" />
              ) : (
                <X className="text-red-500" />
              )}
            </>
          )}
        </div>
      ))}
      {isEditing && (
        <Button type="button" variant="outline" onClick={handleAddOption}>
          Add Option
        </Button>
      )}
    </div>
  );
};
