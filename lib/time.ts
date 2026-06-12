export const REFRESH_TIME_ZONE = "America/New_York";
export const REFRESH_HOUR = 7;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function numberPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number(value) : 0;
}

export function getZonedParts(date: Date, timeZone = REFRESH_TIME_ZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const hour = numberPart(parts, "hour");

  return {
    year: numberPart(parts, "year"),
    month: numberPart(parts, "month"),
    day: numberPart(parts, "day"),
    hour: hour === 24 ? 0 : hour,
    minute: numberPart(parts, "minute"),
    second: numberPart(parts, "second")
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone = REFRESH_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

export function zonedTimeToUtc(parts: ZonedParts, timeZone = REFRESH_TIME_ZONE) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let candidate = new Date(utcGuess.getTime() - offset);
  const adjustedOffset = getTimeZoneOffsetMs(candidate, timeZone);

  if (adjustedOffset !== offset) {
    candidate = new Date(utcGuess.getTime() - adjustedOffset);
  }

  return candidate;
}

function addCalendarDays(parts: ZonedParts, days: number): ZonedParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second
  };
}

export function getNextRefreshAt(now = new Date(), timeZone = REFRESH_TIME_ZONE) {
  const parts = getZonedParts(now, timeZone);
  const todayAtRefresh = {
    ...parts,
    hour: REFRESH_HOUR,
    minute: 0,
    second: 0
  };
  let candidate = zonedTimeToUtc(todayAtRefresh, timeZone);

  if (candidate.getTime() <= now.getTime()) {
    candidate = zonedTimeToUtc(addCalendarDays(todayAtRefresh, 1), timeZone);
  }

  return candidate;
}

export function isSameZonedDay(
  left: Date,
  right: Date,
  timeZone = REFRESH_TIME_ZONE
) {
  const leftParts = getZonedParts(left, timeZone);
  const rightParts = getZonedParts(right, timeZone);

  return (
    leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day
  );
}

export function hasReachedRefreshHour(now = new Date(), timeZone = REFRESH_TIME_ZONE) {
  return getZonedParts(now, timeZone).hour >= REFRESH_HOUR;
}

export function isScheduledRefreshWindow(now = new Date(), timeZone = REFRESH_TIME_ZONE) {
  const parts = getZonedParts(now, timeZone);
  return parts.hour === REFRESH_HOUR;
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}
