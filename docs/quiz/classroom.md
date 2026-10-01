# Classroom — Teachers, Classes and Host mode

What exists **today** for Teachers playing Associations with a class. The words are in
[`glossary.md`](./glossary.md) ("Classroom"); what is still being built is
[`classroom-plan.md`](./classroom-plan.md), and moves here as it lands. The role itself is
[`../auth/teacher-role.md`](../auth/teacher-role.md).

> **Status (2026-10-01):** the Teacher role and Classes are built. Host mode is being built
> (plan phases 3–6).

---

## 1. Classes

A **Class** is a Teacher's saved, named list of students — **first names only, not accounts** —
that Teams are formed from when hosting. It is optional: a Teacher can host with Team names alone.

- **Rules** (`ClassService`): a name of up to 40 characters, **unique per Teacher**
  (case-insensitive); up to **40 students**, each up to 30 characters. Names are trimmed and inner
  whitespace collapsed; blank lines are dropped. **Duplicate student names are allowed** — two Artas
  in one class happens, and the Teacher tells them apart.
- **Ownership:** every read and write goes through `IClassRepository` with the Teacher's id, so
  another Teacher's Class is a 404, never a 403 that confirms it exists. `ClassesController` is
  `[Authorize(Roles = "Teacher")]`.
- **Saving replaces the whole list**, in the order given.
- **Account anonymisation removes a Teacher's Classes** (`AccountClosureService.AnonymiseAsync`):
  they are other people's personal data, kept only for that account.

`/api/classes` — `GET`, `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}`.

**Screen:** *My dashboard → Classroom → Classes* (`src/pages/Classroom/ClassesPage.tsx`): a card per
Class; New / Edit opens a dialog with the name and a box of names, one per line, with a live count
against the limit (`parseStudents` mirrors the server's cleaning).

Tables: `Classes` (`OwnerUserId` → Users, cascade), `ClassStudents` (`ClassId` → Classes, cascade,
`Order`). Migration `AddClasses`.

Tests: `QuizAPI.Tests/Classroom/ClassServiceTests.cs`, `src/pages/Classroom/api/__tests__/classes.test.ts`.
