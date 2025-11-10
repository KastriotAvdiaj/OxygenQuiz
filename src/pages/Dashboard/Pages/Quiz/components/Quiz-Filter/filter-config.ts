
export type FilterAction =
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_CATEGORY"; payload: number | undefined }
  | { type: "SET_DIFFICULTY"; payload: number | undefined }
  | { type: "SET_LANGUAGE"; payload: number | undefined }
  | { type: "SET_VISIBILITY"; payload: string | undefined }
  | { type: "SET_IS_PUBLISHED"; payload: boolean | undefined }
  | { type: "SET_IS_ACTIVE"; payload: boolean | undefined }
  | { type: "CLEAR_ALL" };

// Define the shape of our filter state
export interface FilterState {
  searchTerm: string;
  selectedCategoryId: number | undefined;
  selectedDifficultyId: number | undefined;
  selectedLanguageId: number | undefined;
  selectedVisibility: string | undefined;
  selectedIsPublished: boolean | undefined;
  selectedIsActive: boolean | undefined;
}

// Define the initial state for our reducer
export const initialFilterState: FilterState = {
  searchTerm: "",
  selectedCategoryId: undefined,
  selectedDifficultyId: undefined,
  selectedLanguageId: undefined,
  selectedVisibility: undefined,
  selectedIsPublished: undefined,
  selectedIsActive: undefined,
};

// Create the reducer function that handles state updates
export function filterReducer(
  state: FilterState,
  action: FilterAction
): FilterState {
  switch (action.type) {
    case "SET_SEARCH_TERM":
      return { ...state, searchTerm: action.payload };
    case "SET_CATEGORY":
      return { ...state, selectedCategoryId: action.payload };
    case "SET_DIFFICULTY":
      return { ...state, selectedDifficultyId: action.payload };
    case "SET_LANGUAGE":
      return { ...state, selectedLanguageId: action.payload };
    case "SET_VISIBILITY":
      return { ...state, selectedVisibility: action.payload };
    case "SET_IS_PUBLISHED":
      return { ...state, selectedIsPublished: action.payload };
    case "SET_IS_ACTIVE":
      return { ...state, selectedIsActive: action.payload };
    case "CLEAR_ALL":
      return initialFilterState;
    default:
      return state;
  }
}
