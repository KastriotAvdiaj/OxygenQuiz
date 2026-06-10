import { rule, type FilterRule } from "@/lib/filtering";
import type { FilterState } from "./filter-config";

/**
 * Adapter between the Quiz-Filter UI state and the shared filtering framework.
 *
 * The filter components (reducer, panel, presets, pills) keep their existing FilterState
 * shape; this is the single place that translates that state into framework FilterRule[].
 * Search, sort and paging are owned by the page, so they are intentionally NOT produced here.
 *
 * Only set values become rules — undefined fields are skipped, so the result contains
 * exactly the active filters.
 */
export function quizFilterStateToRules(state: FilterState): FilterRule[] {
  const rules: FilterRule[] = [];

  if (state.selectedCategoryId != null) rules.push(rule.eq("categoryId", state.selectedCategoryId));
  if (state.selectedDifficultyId != null) rules.push(rule.eq("difficultyId", state.selectedDifficultyId));
  if (state.selectedLanguageId != null) rules.push(rule.eq("languageId", state.selectedLanguageId));
  if (state.selectedVisibility != null) rules.push(rule.eq("visibility", state.selectedVisibility));
  if (state.selectedIsPublished != null) rules.push(rule.eq("isPublished", state.selectedIsPublished));
  if (state.selectedIsActive != null) rules.push(rule.eq("isActive", state.selectedIsActive));

  return rules;
}
