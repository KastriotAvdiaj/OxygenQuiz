import { Controller, Control, FieldError } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";

interface ScoreSelectProps {
  control?: Control<any>;
  name?: string;
  error?: FieldError;
  id?: string;
}

const scoreOptions = [
  { value: "5", label: "Standard" },
  { value: "10", label: "Double" },
  { value: "20", label: "Quadruple" },
];

export const ScoreSelect = ({ control, name, error, id }: ScoreSelectProps) => {
  return (
    <div>
      <Label htmlFor={id} className="text-sm  mb-2 block">
        Select Score
      </Label>
      <Controller
        name={name ? name : "score"}
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
