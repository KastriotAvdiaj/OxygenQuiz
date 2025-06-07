import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tag,
  Calendar,
  Languages,
  Info,
  Eye,
  ChartNetwork,
  Shapes,
} from "lucide-react";
import { AnyQuestion } from "@/types/ApiTypes";
import formatDate from "@/lib/date-format";


interface QuestionMetadataProps {
  question: AnyQuestion;
  backgroundColor?: string;
}

export const QuestionMetadata: React.FC<QuestionMetadataProps> = ({
  question,
  backgroundColor = "bg-muted/30"
}) => (
  <Accordion type="single" collapsible className="w-full">
    <AccordionItem value="metadata">
      <AccordionTrigger>
        <p className="flex gap-2 items-center">
          Extra Information <Info className="h-4 w-4" />
        </p>
      </AccordionTrigger>
      <AccordionContent>
        <div className={`grid grid-cols-2 gap-4 mb-4 p-4 ${backgroundColor} rounded-lg`}>
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <Badge variant="outline" className="text-xs">
              {question.category.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ChartNetwork size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Difficulty:</span>
            <Badge variant="outline" className="text-xs">
              {question.difficulty.level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Languages size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Language:</span>
            <Badge variant="outline" className="text-xs">
              {question.language.language}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(question.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Eye size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Visibility:</span>
            <Badge variant="outline" className="text-xs">
              {question.visibility}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shapes size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline" className="text-xs">
              {question.type}
            </Badge>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);