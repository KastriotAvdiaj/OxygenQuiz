import { useState } from "react";
import { Label } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayCircle } from "lucide-react";
import { TestConfig } from "./test-question-button";
import { PointSystem } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/types";
import { LiftedButton } from "@/common/LiftedButton";


interface TestConfigurationProps {
  defaultConfig: TestConfig;
  onStartTest: (config: TestConfig) => void;
}

const TIME_LIMIT_OPTIONS = [
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 20, label: "20 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 45, label: "45 seconds" },
  { value: 60, label: "1 minute" },
  { value: 90, label: "1.5 minutes" },
  { value: 120, label: "2 minutes" },
];

export const TestConfiguration = ({
  defaultConfig,
  onStartTest,
}: TestConfigurationProps) => {
  const [config, setConfig] = useState<TestConfig>(defaultConfig);

  const handleStartTest = () => {
    onStartTest(config);
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timeLimit" className="text-base font-medium">
            Time Limit
          </Label>
          <Select
            value={config.timeLimitInSeconds.toString()}
            onValueChange={(value) =>
              setConfig({ ...config, timeLimitInSeconds: parseInt(value) })
            }
          >
            <SelectTrigger id="timeLimit" className="w-full" variant="quiz">
              <SelectValue placeholder="Select time limit" />
            </SelectTrigger>
            <SelectContent variant="quiz">
              {TIME_LIMIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()} variant="quiz">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            The timer will start immediately when the question appears
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pointSystem" className="text-base font-medium">
            Point System
          </Label>
          <Select
            value={config.pointSystem}
            onValueChange={(value) =>
              setConfig({ ...config, pointSystem: value as PointSystem })
            }
          >
            <SelectTrigger id="pointSystem" className="w-full"  variant="quiz">
              <SelectValue placeholder="Select point system" />
            </SelectTrigger>
            <SelectContent variant="quiz">
              <SelectItem value={PointSystem.Standard} variant="quiz">
                Standard (1x points)
              </SelectItem>
              <SelectItem value={PointSystem.Double} variant="quiz">
                Double (2x points)
              </SelectItem>
              <SelectItem value={PointSystem.Quadruple} variant="quiz">
                Quadruple (4x points)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Base score is 10 points + time bonus. Multiplier applies to total.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <LiftedButton
          onClick={handleStartTest}
          className="gap-2 bg-primary text-white"
        >
          <PlayCircle className="h-5 w-5" />
          Start Test
        </LiftedButton>
      </div>
    </div>
  );
};