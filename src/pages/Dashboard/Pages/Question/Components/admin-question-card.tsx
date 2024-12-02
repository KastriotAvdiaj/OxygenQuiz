import React, { useState, useRef, useEffect } from "react"
import { Question } from "@/types/ApiTypes"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { QuestionEditForm } from "./edit-question"
import { AnswerOptionList } from "./answer-otpion-list"
import gsap from "gsap"
import { Label } from "@/components/ui/form"

interface QuestionAdminCardProps {
  question: Question
}

export const AdminQuestionCard: React.FC<QuestionAdminCardProps> = ({ question }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => setIsExpanded(!isExpanded)
  const handleEdit = () => setIsEditing(true)
  const handleCancelEdit = () => setIsEditing(false)

  const handleUpdate = (updatedQuestion: Question) => {
    // Implement update logic here
    setIsEditing(false)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "hard":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  useEffect(() => {
    if (contentRef.current && cardRef.current) {
      gsap.set(contentRef.current, { height: 0, opacity: 0 })
      gsap.set(cardRef.current, { y: 20, opacity: 0 })

      gsap.to(cardRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
      })
    }
  }, [])

  useEffect(() => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        height: isExpanded ? "auto" : 0,
        opacity: isExpanded ? 1 : 0,
        duration: 0.5,
        ease: "power3.inOut",
      })
    }
  }, [isExpanded])

  return (
    <Card
      ref={cardRef}
      className={`w-full bg-background rounded-[0.3rem] max-w-5xl mx-auto overflow-hidden transition-shadow duration-200 ${
        isExpanded ? "shadow-lg" : "shadow"
      } border-2 relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between p-4">
        <div
          onClick={handleToggle}
          className="flex-grow cursor-pointer flex items-center h-full justify-between pr-4"
        >
          <div onClick={handleToggle}>
            <h3 className="text-xl font-semibold">{question.text}</h3>
          <Label className="text-sm text-gray-300 ml-2">Category</Label>

          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500 ml-2" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 ml-2" />
          )}
        </div>
        <div className="flex flex-col items-center space-y-2">
          <Badge
            className={`${getDifficultyColor(question.difficultyDisplay)} border-none rounded-sm`}
            variant="outline"
          >
            {question.difficultyDisplay}
          </Badge>
          <div className="flex space-x-2 transition-opacity duration-200" style={{ opacity: isHovered ? 1 : 0 }}>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-blue-500"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:text-red-500"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div ref={contentRef} className="overflow-hidden">
        <CardContent className="pt-0">
          {isEditing ? (
            <QuestionEditForm question={question} onUpdate={handleUpdate} onCancel={handleCancelEdit} />
          ) : (
            <AnswerOptionList options={question.answerOptions} />
          )}
        </CardContent>
      </div>
    </Card>
  )
}

