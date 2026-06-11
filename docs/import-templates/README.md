# Import templates

Ready-to-edit templates for every list that supports import. Column headers match the server's
import fields exactly (matching is case-insensitive, and column order doesn't matter). Edit the
rows, then use the **Import** button on the matching dashboard list — CSV, Excel (`.xlsx`), or JSON
are all accepted (format is detected from the file extension).

| List | Template | Columns |
|---|---|---|
| Categories | `categories-template.csv` | `Name` (required), `Gradient` (true/false), `ColorPaletteJson` (optional JSON string) |
| Difficulties | `difficulties-template.csv` | `Level` (required), `Weight` (optional integer) |
| Languages | `languages-template.csv` | `Language` (required) |
| Users | `users-template.csv` | `Username`, `Email` (required); `Password` (blank → a default is set); `Roles` (pipe-separated, blank → `user`) |
| Questions | `questions-template.csv` / `.json` | see below |

## Notes

- **Empty optional cells are fine** — leave `ColorPaletteJson`, `Weight`, `Password`, etc. blank.
- **Pipe-separated lists** use `|` (e.g. Users `Roles` = `Admin|user`).
- **Rows that fail validation are skipped, not fatal** — the import result reports how many were
  added vs skipped and why, so a bad row won't abort the whole file.
- **Duplicates are skipped (idempotent).** Re-importing the same file won't create copies:
  categories / difficulties / languages are de-duplicated by name (case-insensitive); questions by
  the same **Text + Type** (for you as the creator); users by username/email. Skipped duplicates are
  reported in the result. So it's safe to re-run an import.
- **Users**: blank `Password` falls back to a default the admin should have the user reset; blank
  `Roles` defaults to `user`.

## Questions

The richest list. Fill only the columns relevant to each row's `Type`:

| Column | Applies to | Meaning |
|---|---|---|
| `Type` | all | `MultipleChoice`, `TrueFalse`, or `TypeTheAnswer` |
| `Text` | all | the question text |
| `CategoryId`, `DifficultyId`, `LanguageId` | all | integer IDs that **must already exist** (export those lists to find them) |
| `Visibility` | all | `Global` or `Private` |
| `Options` | MultipleChoice | choices, pipe-separated: `Paris\|London\|Berlin` |
| `CorrectOptions` | MultipleChoice | which option(s) are correct (subset of `Options`) |
| `AllowMultipleSelections` | MultipleChoice | true/false |
| `CorrectAnswer` | TrueFalse | true/false |
| `TypeAnswer` | TypeTheAnswer | the canonical correct answer |
| `AcceptableAnswers` | TypeTheAnswer | accepted alternates, pipe-separated |
| `IsCaseSensitive`, `AllowPartialMatch` | TypeTheAnswer | true/false |
