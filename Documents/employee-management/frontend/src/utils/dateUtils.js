/**
 * Converts a local date to UTC
 * @param {Date} localDate - Local date object
 * @returns {Date} UTC date object
 */
export const toUTC = (localDate) => {
  if (!localDate) return null;
  return new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      localDate.getHours(),
      localDate.getMinutes(),
      localDate.getSeconds()
    )
  );
};

/**
 * Converts a UTC date to local
 * @param {string|Date} utcDate - UTC date string or object
 * @returns {Date} Local date object
 */
export const toLocal = (utcDate) => {
  if (!utcDate) return null;
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
};

/**
 * Checks if a date has a non-zero time component
 * @param {Date} date - Date object
 * @returns {boolean} True if date has time component
 */
export const hasTimeComponent = (date) => {
  if (!date) return false;
  
  // Handle string 'null' or 'undefined'
  if (date === 'null' || date === 'undefined' || date === null || date === undefined) {
    return false;
  }
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }
  
  return date.getHours() !== 0 || date.getMinutes() !== 0;
};

/**
 * Formats a date for display
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  // Handle string 'null' or 'undefined'
  if (date === 'null' || date === 'undefined' || date === null || date === undefined) {
    return '';
  }
  
  // Convert string to Date object if needed
  let dateObj = date;
  if (typeof date === 'string') {
    // Handle ISO date strings and other formats
    dateObj = new Date(date);
  }
  
  // Check if it's a valid Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.warn('Invalid date format:', date);
    return 'Неверная дата';
  }
  
  return new Intl.DateTimeFormat('ru', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(hasTimeComponent(dateObj) && {
      hour: '2-digit',
      minute: '2-digit'
    })
  }).format(dateObj);
}; 