import { Controller, Control, FieldError } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScoreSelectProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  id?: string;
}

const scoreOptions = [
  { value: "5", label: "5 points" },
  { value: "10", label: "10 points" },
  { value: "20", label: "20 points" },
  { value: "30", label: "30 points" },
  { value: "45", label: "45 points" },
  { value: "60", label: "60 points" },
];

export const ScoreSelect = ({ control, name, error, id }: ScoreSelectProps) => {
  return (
    <div>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            value={field.value?.toString() || scoreOptions[1].value}
          >
            <SelectTrigger id={id} variant="quiz" >
              <SelectValue
                className="text-foreground"
                placeholder="Select score"
              />
            </SelectTrigger>
            <SelectContent>
              {scoreOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
};
