import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerProps {
  /** ISO date (`yyyy-MM-dd`) or `""` for empty. Matches what `<input type="date">` emitted. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  /** Days before this are unselectable. Pass `new Date()` for "future only". */
  minDate?: Date;
  disabled?: boolean;
  /**
   * Render the calendar in place instead of portalling it. Rarely what you want: a
   * calendar rendered inside a scrollable, height-capped container (every `DialogContent`)
   * gets clipped by it and makes the dialog scroll. See the comment on `PopoverContent`.
   */
  portalled?: boolean;
  className?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
/** Monday-first, matching the rest of the app's date formatting. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

const parseValue = (value: string): Date | null => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

/**
 * Themed replacement for `<input type="date">`.
 *
 * The native control renders the browser's own calendar, which takes no styling beyond
 * `color-scheme` — on a dark app it opened as a white panel with the browser's blue. This
 * one is built from the app's tokens, so it matches the surface it opens over and follows
 * the theme toggle.
 *
 * The trigger deliberately reuses the `.minimal-input` classes rather than re-implementing
 * them: it has to sit in a stack of minimal fields and look like one of them.
 */
export const DatePicker = ({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  minDate,
  disabled = false,
  portalled = true,
  className,
}: DatePickerProps) => {
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() =>
    startOfMonth(selected ?? new Date())
  );

  const min = minDate ? startOfDay(minDate) : null;

  // Re-anchoring the grid on the selected month belongs to the act of opening, so it lives
  // in the handler. An Effect watching `open` would do the same work a render later, and
  // for no reason — nothing outside React is being synchronized (see CLAUDE.md).
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setMonth(startOfMonth(selected ?? new Date()));
    setOpen(nextOpen);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTIONS),
  });

  const select = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className="minimal-input-wrapper">
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "minimal-input flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span className={cn(!selected && "text-muted-foreground/60")}>
              {selected ? format(selected, "dd/MM/yyyy") : placeholder}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
      </div>

      {/* `pointer-events-auto` is what lets this float over a modal Dialog. Radix locks the
          body with `pointer-events: none` while a modal Dialog is open, and a portalled
          popover is a child of that body, so without this every click on a day is
          swallowed. Re-enabling it on the layer itself keeps the calendar clickable while
          leaving the rest of the lock intact — and, unlike rendering in place, the calendar
          escapes the dialog's own scroll area instead of being clipped inside it.
          `collisionPadding` lets it flip above the field near the bottom of the screen. */}
      <PopoverContent
        portalled={portalled}
        align="start"
        collisionPadding={12}
        className="pointer-events-auto w-auto p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth(subMonths(month, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="py-1 text-xs font-medium text-muted-foreground"
            >
              {weekday}
            </span>
          ))}

          {days.map((day) => {
            const isSelected = selected ? isSameDay(day, selected) : false;
            const isOutside = !isSameMonth(day, month);
            const isDisabled = min ? day < min : false;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isDisabled}
                aria-current={isSameDay(day, new Date()) ? "date" : undefined}
                onClick={() => select(day)}
                className={cn(
                  "h-8 w-8 rounded-md text-sm transition-colors",
                  "hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
                  isOutside && "text-muted-foreground/50",
                  isSameDay(day, new Date()) &&
                    !isSelected &&
                    "font-semibold text-primary",
                  isSelected &&
                    "bg-primary font-semibold text-white hover:bg-primary",
                  isDisabled &&
                    "cursor-not-allowed text-muted-foreground/30 hover:bg-transparent"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t pt-2 dark:border-foreground/20">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => select(new Date())}
            className="text-xs text-primary transition-colors hover:underline"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
