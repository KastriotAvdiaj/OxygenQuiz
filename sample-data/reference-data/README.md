# Reference data (importable)

Starter **categories**, **difficulties**, and **languages** for a fresh Oxygen Quiz
instance. These are the lookup lists every question and quiz is tagged with, so importing
them first gives you something to build on without hand-creating each entry.

These files are **not seeded automatically** — they're meant to be brought in through the
admin **Data Import** UI (the same import that backs the questions/quizzes samples in the
parent folder). Import order doesn't matter, but importing all three before creating
questions/quizzes is the natural flow.

## Files

| File | Rows | Goes to |
|---|---|---|
| `categories.json` | 24 categories, each with a themed colour palette | Dashboard → Questions → **Categories** |
| `difficulties.json` | 6 levels (`Easy` → `Expert`), weighted 1–6 | Dashboard → Questions → **Difficulties** |
| `languages.json` | 4 languages (English, Albanian, Spanish, French) | Dashboard → Questions → **Languages** |

## How to import

1. Sign in as an **Admin** or **SuperAdmin**.
2. Open the relevant admin list (Categories / Difficulties / Languages).
3. Use the **Import** control and upload the matching `.json` file.
4. The importer reports how many rows were added and skips any that already exist
   (matched case-insensitively by name / level / language), so re-running is safe.

> The import also accepts `.csv` and `.xlsx`; JSON is used here because a category's colour
> palette is itself a small JSON array (see below), which travels most cleanly as JSON.

## Field reference

**categories.json** — matches the category import row:

```json
{ "Name": "Science", "Gradient": true, "ColorPaletteJson": "[\"#2563EB\",\"#22D3EE\"]" }
```

- `Name` — display name (unique, case-insensitive).
- `ColorPaletteJson` — a **JSON string** holding an array of 2–5 hex colours (`#RRGGBB`).
  It's stored verbatim and the app `JSON.parse`s it back into a colour list. The **first
  colour is the primary/identifying colour**; the rest extend the gradient.
- `Gradient` — when `true`, the palette renders as a left-to-right linear gradient; when
  `false`, the colours show as solid swatches.

**difficulties.json** — `{ "Level": "Medium-Hard", "Weight": 4 }`. `Weight` orders the
levels (ascending = harder) and can be used to balance quizzes.

**languages.json** — `{ "Language": "Albanian" }`.

## About the category colour (the quiz-select UX)

Colour is how quizzes are told apart at a glance in the quiz-select grid. Each quiz inherits
its category's palette, and the card (`ColorCard` / `quiz-card`) paints itself from it — a
gradient wash when `Gradient` is on, or the primary colour otherwise — with the first colour
driving badges and accents. So the palettes here are chosen to be **distinct and thematic**
(e.g. Science = blue→cyan, History = amber/brown, Sports = orange→red, Nature = greens),
which keeps the grid readable and visually varied out of the box. You can tune any palette
later in the category editor (it has a live card preview and an "AI color assistant").
