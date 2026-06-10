import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";

// A boolean attribute filter with three states: no opinion / must be true / must be false.
export type TriState = "any" | "yes" | "no";

interface TriStateSelectProps {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
  yesLabel?: string;
  noLabel?: string;
}

export const TriStateSelect = ({
  label,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
}: TriStateSelectProps) => (
  <div className="flex flex-col gap-1">
    <Label className="text-xs font-medium text-foreground">{label}</Label>
    <Select value={value} onValueChange={(v) => onChange(v as TriState)}>
      <SelectTrigger variant="form">
        <SelectValue />
      </SelectTrigger>
      <SelectContent variant="form">
        <SelectItem variant="form" value="any">Any</SelectItem>
        <SelectItem variant="form" value="yes">{yesLabel}</SelectItem>
        <SelectItem variant="form" value="no">{noLabel}</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
