// I DONT THINK THIS IS USED

import { Label } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const difficultyOptions = [
  { label: "Easy", value: 0 },
  { label: "Medium", value: 1 },
  { label: "Hard", value: 2 },
];

export const DifficultySelector = ({
  setValue,
  error,
}: {
  setValue: (key: string, value: any) => void;
  error: any;
}) => (
  <div className="flex flex-col space-y-1.5">
    <Label htmlFor="difficulty">Difficulty</Label>
    <Select onValueChange={(value) => setValue("difficulty", parseInt(value))}>
      <SelectTrigger
        id="difficulty"
        className={`${error ? "border-red-500" : "border-border"}`}
      >
        <SelectValue placeholder="Select Difficulty" />
      </SelectTrigger>
      <SelectContent className="bg-muted cursor-pointer">
        {difficultyOptions.map((option) => (
          <SelectItem
            className="hover:bg-muted cursor-pointer focus:bg-muted"
            key={option.value}
            value={option.value.toString()}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && (
      <p className="text-sm text-red-500 font-semibold">{error.message}</p>
    )}
  </div>
);
