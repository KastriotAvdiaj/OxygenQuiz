import React, { useState } from "react";
import {
  Search,
  Plus,
  CheckCircle,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import {
  CategoryDTO,
  QuestionBase,
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
  QuestionType,
} from "@/types/ApiTypes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Button,
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";

interface SelectQuestionComponentProps {
  onQuestionsSelected?: (questions: QuestionBase[]) => void;
  categories?: QuestionCategory[];
  difficulties?: QuestionDifficulty[];
  languages?: QuestionLanguage[];
  questions?: QuestionBase[];
  questionType?: QuestionType;
  isLoading?: boolean;
}

const SelectQuestionComponent: React.FC<SelectQuestionComponentProps> = ({
  onQuestionsSelected,
  categories = [],
  difficulties = [],
  languages = [],
  questions = [],
  questionType,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<
    number | undefined
  >();
  const [selectedLanguageId, setSelectedLanguageId] = useState<
    number | undefined
  >();
  const [activeTab, setActiveTab] = useState(QuestionType.MultipleChoice);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;

  // Filter questions based on current filters and tab
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.text
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategoryId || question.category.id === selectedCategoryId;
    const matchesDifficulty =
      !selectedDifficultyId || question.difficulty.id === selectedDifficultyId;
    const matchesLanguage =
      !selectedLanguageId || question.language.id === selectedLanguageId;
    const matchesType = question.type === activeTab;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesDifficulty &&
      matchesLanguage &&
      matchesType
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const paginatedQuestions = filteredQuestions.slice(
    startIndex,
    startIndex + questionsPerPage
  );

  const toggleQuestionSelection = (questionId: number) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const handleAddSelectedQuestions = () => {
    const questionsToAdd = questions.filter((q) => selectedQuestions.has(q.id));
    onQuestionsSelected?.(questionsToAdd);
    setSelectedQuestions(new Set());
    setIsOpen(false);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategoryId(undefined);
    setSelectedDifficultyId(undefined);
    setSelectedLanguageId(undefined);
    setCurrentPage(1);
    setShowFilters(false);
  };

  // Count active filters
  const activeFiltersCount = [
    searchTerm,
    selectedCategoryId,
    selectedDifficultyId,
    selectedLanguageId,
  ].filter(Boolean).length;

  const handleTabChange = (type: QuestionType) => {
    setActiveTab(type);
    setCurrentPage(1);
  };

  const QuestionCard = ({ question }: { question: QuestionBase }) => {
    const isSelected = selectedQuestions.has(question.id);
    const category = categories.find((c) => c.id === question.category.id);
    const difficulty = difficulties.find(
      (d) => d.id === question.difficulty.id
    );

    return (
      <div
        className={`p-4 border rounded-lg cursor-pointer transition-all ${
          isSelected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
        }`}
        onClick={() => toggleQuestionSelection(question.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                {question.type?.replace(/([A-Z])/g, " $1").trim()}
              </span>
              {category && (
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-blue-600 dark:text-blue-400">
                  {category.name}
                </span>
              )}
              {difficulty && (
                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-green-600 dark:text-green-400">
                  {difficulty.level}
                </span>
              )}
            </div>
            <p className="text-sm font-medium mb-2">{question.text}</p>

            {/* {question.type === "MultipleChoice" && question.options && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Options: {question.join(", ")}
              </div>
            )} */}
          </div>

          <div className="ml-4">
            {isSelected ? (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            ) : (
              <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <LiftedButton onClick={() => setIsOpen(true)} className="h-fit">
        <Plus className="h-4 w-4" />
        Add Questions from Pool
      </LiftedButton>
    
    
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Dialog Content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                Select Questions from Pool
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedQuestions.size} selected
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Search and Filter Toggle Bar */}
              <div className="flex items-center gap-3 mb-6">
                {/* Main Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
                  />
                </div>

                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg font-medium transition-colors ${
                    showFilters || activeFiltersCount > 0
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showFilters ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Collapsible Advanced Filters */}
              {showFilters && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm">Advanced Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Category
                      </label>
                      {/* <Select
        value={selectedCategoryId ? selectedCategoryId.toString() : "all"}
        onValueChange={(value) =>
          onCategoryChange(value === "all" ? undefined : Number(value))
        }
      >
        <SelectTrigger variant="quiz">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select> */}
                      <select
                        value={selectedCategoryId}
                        onChange={(e) =>
                          setSelectedCategoryId(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 text-sm"
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Difficulty
                      </label>
                      <select
                        value={selectedDifficultyId}
                        onChange={(e) =>
                          setSelectedDifficultyId(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 text-sm"
                      >
                        <option value="">All Difficulties</option>
                        {difficulties.map((difficulty) => (
                          <option key={difficulty.id} value={difficulty.id}>
                            {difficulty.level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Language
                      </label>
                      <select
                        value={selectedLanguageId}
                        onChange={(e) =>
                          setSelectedLanguageId(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 text-sm"
                      >
                        <option value="">All Languages</option>
                        {languages.map((language) => (
                          <option key={language.id} value={language.id}>
                            {language.language}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active Filters Display */}
                  {activeFiltersCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Active filters:
                        </span>
                        {searchTerm && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                            Search: "{searchTerm}"
                            <button
                              onClick={() => setSearchTerm("")}
                              className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {selectedCategoryId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {
                              categories.find(
                                (c) => c.id === selectedCategoryId
                              )?.name
                            }
                            <button
                              onClick={() => setSelectedCategoryId(undefined)}
                              className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {selectedDifficultyId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {
                              difficulties.find(
                                (d) => d.id === selectedDifficultyId
                              )?.level
                            }
                            <button
                              onClick={() => setSelectedDifficultyId(undefined)}
                              className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        {selectedLanguageId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {
                              languages.find((l) => l.id === selectedLanguageId)
                                ?.language
                            }
                            <button
                              onClick={() => setSelectedLanguageId(undefined)}
                              className="hover:text-blue-900 dark:hover:text-blue-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-2"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Question Type Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as QuestionType)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value={QuestionType.MultipleChoice}>
                    Multiple Choice
                  </TabsTrigger>
                  <TabsTrigger value={QuestionType.TrueFalse}>
                    True/False
                  </TabsTrigger>
                  <TabsTrigger value={QuestionType.TypeTheAnswer}>
                    Type Answer
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Loading State */}
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading questions...
                </div>
              ) : (
                <>
                  {/* Questions List */}
                  <div className="space-y-3 mb-6">
                    {paginatedQuestions.length > 0 ? (
                      paginatedQuestions.map((question) => (
                        <QuestionCard key={question.id} question={question} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No questions found matching your criteria.
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedQuestions.size} question
                {selectedQuestions.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="border border-foreground/30 hover:bg-background"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelectedQuestions}
                  disabled={selectedQuestions.size === 0}
                >
                  Add Selected Questions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectQuestionComponent;
