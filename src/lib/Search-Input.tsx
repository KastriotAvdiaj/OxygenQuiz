import React, { useState, KeyboardEvent } from "react";
import { SearchIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { LiftedButton } from "@/common/LiftedButton";

interface SearchInputProps {
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  className?: string;
  disabled?: boolean;
  initialValue?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  onSearch,
  disabled = false,
  initialValue = "",
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialValue);

  const handleSearch = () => {
    if (!disabled) {
      onSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={`flex items-center justify-between my-4`}>
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="bg-muted px-8 rounded-full hover:bg-primary/20"
          />
          <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 p-0 mt-[1px] text-muted-foreground hover:bg-muted " />

          {searchTerm && (
            <Button
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0  bg-transparent hover:bg-transparent flex items-center justify-center hover:text-red-500 text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <LiftedButton
          onClick={handleSearch}
          disabled={disabled}
          variant="icon"
          className="rounded-xl"
        >
          <SearchIcon size={16} className="mx-1" />
        </LiftedButton>
      </div>
    </div>
  );
};

// Usage example:
export const SearchExample: React.FC = () => {
  const handleSearch = (searchTerm: string) => {
    console.log("Searching for:", searchTerm);
    // Your search logic here
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4">
      <SearchInput
        placeholder="Search quizzes by title, description, or tags..."
        onSearch={handleSearch}
      />
    </div>
  );
};
