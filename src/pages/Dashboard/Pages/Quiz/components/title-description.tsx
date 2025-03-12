import React, { useState } from "react";

interface TitleWithDescriptionProps {
  title: string;
  description: string;
  wordLimit?: number;
}

const TitleWithDescription: React.FC<TitleWithDescriptionProps> = ({
  title,
  description,
  wordLimit = 20,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const words = description.split(" ");
  const isTruncated = words.length > wordLimit;
  const truncatedText = isTruncated
    ? words.slice(0, wordLimit).join(" ") + "..."
    : description;

  return (
    <div className="flex flex-col">
      <span className="font-bold text-lg">{title}</span>
      <span className="text-sm text-gray-600">
        {expanded ? description : truncatedText}
        {isTruncated && (
          <button
            onClick={toggleExpanded}
            className="ml-1 text-blue-600 underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </span>
    </div>
  );
};

export default TitleWithDescription;
