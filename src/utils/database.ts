
// Database utilities for the custom API
export const formatDate = (date: string | Date): string => {
  return new Date(date).toISOString();
};

export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};
