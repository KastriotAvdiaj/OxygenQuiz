import { format, isValid } from "date-fns"; // Import isValid as well for robustness

/**
 * Formats an ISO date string into "MMMM d, yyyy" format.
 * Handles invalid, null, or undefined dates gracefully.
 *
 * @param isoDate - The ISO date string, or null/undefined.
 * @returns The formatted date string, or "no date provided" if the input is invalid or missing.
 */
const formatDate = (isoDate: string | null | undefined): string => {
  if (isoDate === null || isoDate === undefined || isoDate === '') {
    return "no date provided";
  }

  try {
    const date = new Date(isoDate);

  
    if (!isValid(date)) {
      return "no date provided";
    }

    return format(date, "MMMM d, yyyy");

  } catch (error) {

    console.error("Error formatting date:", error);
    return "no date provided"; 
  }
};

export default formatDate;