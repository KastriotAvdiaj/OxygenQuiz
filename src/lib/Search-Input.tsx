import React, { useState, KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
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
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="bg-muted pr-8"
        />

        <LiftedButton onClick={handleSearch} disabled={disabled}>
          <Search className="w-4 h-4" />
        </LiftedButton>

        {/* Clear Button */}
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
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
