/**
 * Utility function to convert duration strings to seconds
 * Handles various duration formats like "3 months", "1 year", "30 days", etc.
 * @param {string|number} duration - Duration in string format or seconds
 * @returns {number} - Duration in seconds
 */
function convertDurationToSeconds(duration) {
  if (typeof duration === 'number') {
    return duration; // Already in seconds
  }

  if (typeof duration === 'string') {
    const durationStr = duration.toLowerCase().trim();

    if (durationStr.includes('month')) {
      const months = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return months * 30 * 24 * 60 * 60; // Convert months to seconds
    } else if (durationStr.includes('year')) {
      const years = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return years * 365 * 24 * 60 * 60; // Convert years to seconds
    } else if (durationStr.includes('week')) {
      const weeks = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return weeks * 7 * 24 * 60 * 60; // Convert weeks to seconds
    } else if (durationStr.includes('day')) {
      const days = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return days * 24 * 60 * 60; // Convert days to seconds
    } else if (durationStr.includes('hour')) {
      const hours = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return hours * 60 * 60; // Convert hours to seconds
    } else if (durationStr.includes('minute') || durationStr.includes('min')) {
      const minutes = parseInt(durationStr.match(/\d+/)?.[0] || '1');
      return minutes * 60; // Convert minutes to seconds
    } else {
      // Try to parse as a number (assuming days)
      const numberMatch = durationStr.match(/\d+/);
      if (numberMatch) {
        const days = parseInt(numberMatch[0]);
        return days * 24 * 60 * 60; // Convert days to seconds
      }
    }
  }

  return 30 * 24 * 60 * 60; // Default to 30 days in seconds
}

/**
 * Convert seconds to human readable duration string
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Human readable duration
 */
function convertSecondsToHumanReadable(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      return remainingDays > 0 ? `${years} year${years > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`;
    } else if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return remainingDays > 0 ? `${months} month${months > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''}`;
    } else if (days >= 7) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      return remainingDays > 0 ? `${weeks} week${weeks > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

module.exports = {
  convertDurationToSeconds,
  convertSecondsToHumanReadable
};