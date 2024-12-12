import { format } from "date-fns";

const formatDate = (isoDate: string): string => {
  return format(new Date(isoDate), "MMMM d, yyyy"); 
};

export default formatDate;