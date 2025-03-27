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
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "20", label: "20s" },
  { value: "30", label: "30s" },
  { value: "45", label: "45s" },
  { value: "60", label: "1 minute (60s)" },
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
            <SelectTrigger id={id} variant="quiz">
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
