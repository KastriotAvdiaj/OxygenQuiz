import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, HelpCircle } from "lucide-react"

interface QuizCardProps {
  quiz: {
    id: number
    title: string
    description?: string
    timeLimit?: number
    isPublished: boolean
    passingScore: number
    questions: Array<any> // Using 'any' for simplicity, ideally this would be a proper type
  }
}

export function QuizCard({ quiz }: QuizCardProps) {
  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{quiz.title}</CardTitle>
        {quiz.description && (
          <CardDescription className="text-sm text-muted-foreground">{quiz.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{quiz.timeLimit ? `${quiz.timeLimit} minutes` : "No time limit"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <span>{quiz.questions.length} questions</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <span>Passing score: {quiz.passingScore}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge variant={quiz.isPublished ? "default" : "secondary"}>{quiz.isPublished ? "Published" : "Draft"}</Badge>
        <span className="text-sm text-muted-foreground">ID: {quiz.id}</span>
      </CardFooter>
    </Card>
  )
}

