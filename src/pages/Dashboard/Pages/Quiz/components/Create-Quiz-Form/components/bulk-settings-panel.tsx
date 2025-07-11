// FEATURE FOR LATER USE
// NOT BEING USED ATM

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { Settings, Zap } from "lucide-react";
import { useQuiz } from "../Quiz-questions-context";
import {
  POINT_SYSTEM_OPTIONS,
  TIME_LIMIT_OPTIONS,
} from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/constants";

export const BulkSettingsPanel: React.FC = () => {
  const { addedQuestions, bulkUpdateSettings } = useQuiz();
  const [bulkPointSystem, setBulkPointSystem] = React.useState<string>("");
  const [bulkTimeLimit, setBulkTimeLimit] = React.useState<string>("");

  const handleBulkUpdate = () => {
    const updates: any = {};

    if (bulkPointSystem) {
      updates.pointSystem = bulkPointSystem;
    }

    if (bulkTimeLimit) {
      updates.timeLimitInSeconds = parseInt(bulkTimeLimit);
    }

    if (Object.keys(updates).length > 0) {
      bulkUpdateSettings(updates);
      setBulkPointSystem("");
      setBulkTimeLimit("");
    }
  };

  if (addedQuestions.length === 0) {
    return (
      <Card className="border border-primary/20">
        <CardContent className="p-4 text-center text-muted-foreground">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add questions to manage bulk settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Bulk Settings ({addedQuestions.length} questions)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bulk Point System */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Apply Point System to All
          </Label>
          <Select value={bulkPointSystem} onValueChange={setBulkPointSystem}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select point system..." />
            </SelectTrigger>
            <SelectContent>
              {POINT_SYSTEM_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Time Limit */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Apply Time Limit to All</Label>
          <Select value={bulkTimeLimit} onValueChange={setBulkTimeLimit}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select time limit..." />
            </SelectTrigger>
            <SelectContent>
              {TIME_LIMIT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Apply Button */}
        <Button
          onClick={handleBulkUpdate}
          disabled={!bulkPointSystem && !bulkTimeLimit}
          className="w-full h-8 text-xs"
          variant="default"
        >
          Apply to All Questions
        </Button>
      </CardContent>
    </Card>
  );
};
