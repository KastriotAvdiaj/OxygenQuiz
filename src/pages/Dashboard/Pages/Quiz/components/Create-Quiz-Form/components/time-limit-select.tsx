import { Controller, Control, FieldError } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";

interface TimeLimitSelectProps {
  control?: Control<any>;
  name?: string;
  error?: FieldError;
  id?: string;
}

const timeOptions = [
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "1m" },
];

export const TimeLimitSelect = ({
  control,
  name,
  error,
  id,
}: TimeLimitSelectProps) => {
  return (
    <div>
      <Label htmlFor={id} className="text-sm block text-primary">
        Select Time Limit
      </Label>
      <Controller
        name={name ? name : "timeLimit"}
        control={control}
        render={({ field }) => (
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            value={field.value?.toString() || timeOptions[1].value}
          >
            <SelectTrigger id={id} variant="quiz">
              <SelectValue
                className="text-foreground"
                placeholder="Select time limit"
              />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((option) => (
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
