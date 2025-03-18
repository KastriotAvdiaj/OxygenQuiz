import * as React from "react"
import { useEffect } from "react"
import { useDisclosure } from "@/hooks/use-disclosure"
import { Shuffle, List } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export type ChooseQuizDialogProps = {
  triggerButton: React.ReactElement
  randomQuizButton: React.ReactElement
  chooseQuizButton: React.ReactElement
  title: string
  body?: string
  cancelButtonText?: string
  icon?: "danger" | "info"
  isDone?: boolean
}

export const ChooseQuizDialog = ({
  triggerButton,
  randomQuizButton,
  chooseQuizButton,
  title,
  body = "Select how you'd like to start your quiz experience",
  isDone = false,
}: ChooseQuizDialogProps) => {
  const { close, open, isOpen } = useDisclosure()

  useEffect(() => {
    if (isDone) {
      close()
    }
  }, [isDone, close])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close()
        } else {
          open()
        }
      }}
    >
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>

      <DialogContent className="sm:max-w-md p-6 bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
          {body && <p className="text-center text-muted-foreground mt-2">{body}</p>}
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <div className="mx-auto rounded-full bg-primary/10 p-2">
                <Shuffle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="pt-2 text-center">Random Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Get a randomly selected quiz for a surprise challenge
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              {React.cloneElement(randomQuizButton, {
                className: `${randomQuizButton.props.className || ""} w-full justify-center`,
              })}
            </CardFooter>
          </Card>

          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <div className="mx-auto rounded-full bg-primary/10 p-2">
                <List className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="pt-2 text-center">Choose a Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Browse and select from our collection of available quizzes
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center pt-0">
              {React.cloneElement(chooseQuizButton, {
                className: `${chooseQuizButton.props.className || ""} w-full justify-center`,
              })}
            </CardFooter>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
