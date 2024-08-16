import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

type NewQuestionProps = {
  setIsOpen: (value: boolean) => void;
  isOpen: boolean;
};

export const NewQuestion: React.FC<NewQuestionProps> = ({
  isOpen,
  setIsOpen,
}) => {
  const [numWrongAnswers, setNumWrongAnswers] = useState<number>(3);

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNumWrongAnswers(Number(event.target.value));
  };

  return (
    <Card
      className={`w-[600px] m-6 border-none bg-[var(--background-secondary)] rounded-sm ${
        isOpen ? "visible" : "hidden"
      }`}
    >
      <CardHeader>
        <CardTitle>Create a new question</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-8">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Question</Label>
              <Input
                id="name"
                placeholder="Question"
                className="placeholder-gray-500 !placeholder-gray-400 border-gray-400"
              />
            </div>
            <div className="flex flex-col space-y-1.5 ml-0.5">
              <Label>Select the amount of wrong answers?</Label>
              <div className="flex space-x-4">
                {[1, 2, 3].map((value) => (
                  <label
                    key={value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Input
                      type="radio"
                      name="numWrongAnswers"
                      value={value}
                      checked={numWrongAnswers === value}
                      onChange={handleRadioChange}
                      className="border-gray-400 ml-2 cursor-pointer"
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="correct-answer">Correct Answer *</Label>
                <Input
                  id="correct-answer"
                  placeholder="Correct Answer"
                  className="placeholder-gray-500 !placeholder-gray-400 border-gray-400"
                />
              </div>
              {[...Array(numWrongAnswers)].map((_, index) => (
                <div key={index} className="flex flex-col space-y-1.5">
                  <Label htmlFor={`wrong-answer-${index + 1}`}>
                    Wrong Answer {index + 1}
                  </Label>
                  <Input
                    id={`wrong-answer-${index + 1}`}
                    placeholder={`Wrong Answer ${index + 1}`}
                    className="placeholder-gray-500 !placeholder-gray-400 border-gray-400"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="framework">Difficulty</Label>
              <Select>
                <SelectTrigger id="framework" className="border-gray-400">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="cursor-pointer bg-[var(--background-secondary)]"
                >
                  <SelectItem
                    className="cursor-pointer hover:!bg-[var(--background)]"
                    value="next"
                  >
                    Extra Hard
                  </SelectItem>
                  <SelectItem
                    className="cursor-pointer hover:!bg-[var(--background)]"
                    value="sveltekit"
                  >
                    Hard
                  </SelectItem>
                  <SelectItem
                    className="cursor-pointer hover:!bg-[var(--background)]"
                    value="astro"
                  >
                    Medium
                  </SelectItem>
                  <SelectItem
                    className="cursor-pointer hover:!bg-[var(--background)]"
                    value="nuxt"
                  >
                    Easy
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant={"outline"} onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button
          variant={"addSave"}
          className="rounded-sm"
          onClick={() => setIsOpen(false)}
        >
          Create
        </Button>
      </CardFooter>
    </Card>
  );
};
