/**
 * Date utilities for the application
 * Consolidated date handling functions to avoid duplication
 */

/**
 * Rehydrates Date objects from strings in an object
 * Used to restore Date objects after JSON parsing from localStorage
 * @param obj Object that may contain date strings
 * @returns Object with Date strings converted back to Date objects
 */
export const rehydrateDates = <T>(obj: T): T => {
  if (!obj || typeof obj !== "object") return obj;

  const result = { ...obj } as any;

  // List of common date field names
  const dateFields = [
    "createdAt",
    "updatedAt",
    "lastLogin",
    "birthDate",
    "lastFed",
    "lastPlayed",
    "lastCleaned",
    "startTime",
    "endTime",
    "date",
    "timestamp",
  ];

  dateFields.forEach((field) => {
    if (result[field] && typeof result[field] === "string") {
      try {
        result[field] = new Date(result[field]);
      } catch (error) {
        console.warn(`Failed to parse date field ${field}:`, result[field]);
      }
    }
  });

  return result;
};

/**
 * Formats a date for display
 * @param date Date to format
 * @param format Format type
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  format: "short" | "long" | "time" | "relative" = "short",
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString();
    case "long":
      return dateObj.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "time":
      return dateObj.toLocaleTimeString();
    case "relative":
      return getRelativeTime(dateObj);
    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Gets relative time string (e.g., "2 hours ago")
 * @param date Date to compare
 * @returns Relative time string
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "agora mesmo";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""} atrás`;
  } else if (diffHours < 24) {
    return `${diffHours} hora${diffHours > 1 ? "s" : ""} atrás`;
  } else if (diffDays < 7) {
    return `${diffDays} dia${diffDays > 1 ? "s" : ""} atrás`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Checks if a date is today
 * @param date Date to check
 * @returns True if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Checks if a date is yesterday
 * @param date Date to check
 * @returns True if date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Gets the number of days between two dates
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days between dates
 */
export const getDaysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Adds days to a date
 * @param date Base date
 * @param days Number of days to add
 * @returns New date with days added
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Gets the start of day for a date
 * @param date Date to get start of day for
 * @returns Date at start of day (00:00:00)
 */
export const getStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Gets the end of day for a date
 * @param date Date to get end of day for
 * @returns Date at end of day (23:59:59)
 */
export const getEndOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};
