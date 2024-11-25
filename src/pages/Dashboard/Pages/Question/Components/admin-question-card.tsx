"use client";

import React, { useState, useRef, useEffect } from "react";
import { Question } from "@/types/ApiTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { QuestionEditForm } from "./edit-question";
import { AnswerOptionList } from "./answer-otpion-list";
import gsap from "gsap";
import { Divider } from "@/common/Divider";

interface QuestionAdminCardProps {
  question: Question;
}

export const AdminQuestionCard: React.FC<QuestionAdminCardProps> = ({
  question,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setIsExpanded(!isExpanded);
  const handleEdit = () => setIsEditing(true);
  const handleCancelEdit = () => setIsEditing(false);

  const handleUpdate = (updatedQuestion: Question) => {
    // Implement update logic here
    setIsEditing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-red-500 ";
      default:
        return "bg-gray-c";
    }
  };

  useEffect(() => {
    if (contentRef.current && cardRef.current) {
      gsap.set(contentRef.current, { height: 0, opacity: 0 });
      gsap.set(cardRef.current, { y: 20, opacity: 0 });

      gsap.to(cardRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
      });
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        height: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0,
        duration: 0.5,
        ease: "power3.inOut",
      });
    }
  }, [isExpanded]);

  return (
    <Card
      ref={cardRef}
      className={`w-full bg-background rounded-[0.3rem] max-w-5xl mx-auto overflow-hidden transition-shadow duration-200 ${
        isExpanded ? "shadow-lg" : "shadow"
      }  border-2`}
    >
      <div className="p-4 pr-0 flex">
        <div
          onClick={handleToggle}
          className="w-[90%] flex justify-between cursor-pointer pr-4"
        >
          <div>
            <h3 className="text-xl font-semibold">{question.text}</h3>
            <span className="text-gray-500">Category</span>
          </div>
          <Divider orientation="vertical" length="full" />
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-0 mx-auto">
            <Button variant="icon" size="icon" className="hover:text-red-500">
              <Trash2 className=" h-4 w-4" />
            </Button>
            <Button variant="icon" size="icon" className="hover:text-blue-500">
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <Badge
            className={`${getDifficultyColor(
              question.difficultyDisplay
            )} border-none rounded-sm`}
            variant="outline"
          >
            {question.difficultyDisplay}
          </Badge>
        </div>
      </div>
      <div ref={contentRef} className="overflow-hidden">
        <CardContent className="pt-0">
          {isEditing ? (
            <QuestionEditForm
              question={question}
              onUpdate={handleUpdate}
              onCancel={handleCancelEdit}
            />
          ) : (
            <>
              <AnswerOptionList options={question.answerOptions} />
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  // onClick={() => onDelete(question.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
