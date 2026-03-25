// Blackout dates (in production these come from the DB)
const blackoutDates: string[] = [];

const defaultCutoffTime = "11:00";

export function getCutoffTime(cutoffTime?: string): string {
  return cutoffTime || defaultCutoffTime;
}

export function isPastCutoff(cutoffTime?: string): boolean {
  const now = new Date();
  const [hours, minutes] = getCutoffTime(cutoffTime).split(":").map(Number);
  const cutoff = new Date();
  cutoff.setHours(hours, minutes, 0, 0);
  return now >= cutoff;
}

export function isBlackoutDate(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0];
  return blackoutDates.includes(dateStr);
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function addBusinessDays(
  startDate: Date,
  days: number,
  cutoffTime?: string,
): Date {
  const result = new Date(startDate);
  let added = 0;

  if (days === 0) {
    // Same-day: check cutoff
    if (isPastCutoff(cutoffTime)) {
      result.setDate(result.getDate() + 1);
    }
    // Skip Sundays and blackout dates
    while (isSunday(result) || isBlackoutDate(result)) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isSunday(result) && !isBlackoutDate(result)) {
      added++;
    }
  }

  return result;
}

export function getEarliestFulfillmentDate(
  maxLeadTimeDays: number,
  cutoffTime?: string,
): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addBusinessDays(today, maxLeadTimeDays, cutoffTime);
}

export function isDateDisabled(date: Date, earliestDate: Date): boolean {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const earliest = new Date(earliestDate);
  earliest.setHours(0, 0, 0, 0);

  if (normalized < earliest) return true;
  if (isSunday(normalized)) return true;
  if (isBlackoutDate(normalized)) return true;
  return false;
}

export interface LeadTimeGroup {
  label: string;
  items: Array<{ id: string; name: string; prep_lead_time_days: number }>;
  maxLeadTime: number;
  earliestDate: Date;
}

export function detectMixedLeadTimes(
  items: Array<{ id: string; name: string; prep_lead_time_days: number }>,
): { isMixed: boolean; groups: LeadTimeGroup[] } {
  const maxLead = Math.max(...items.map((i) => i.prep_lead_time_days));
  const minLead = Math.min(...items.map((i) => i.prep_lead_time_days));

  if (maxLead - minLead <= 1) {
    return { isMixed: false, groups: [] };
  }

  const quickItems = items.filter((i) => i.prep_lead_time_days <= 1);
  const slowItems = items.filter((i) => i.prep_lead_time_days > 1);

  const groups: LeadTimeGroup[] = [];

  if (quickItems.length > 0) {
    const qMax = Math.max(...quickItems.map((i) => i.prep_lead_time_days));
    groups.push({
      label: "Ready sooner",
      items: quickItems,
      maxLeadTime: qMax,
      earliestDate: getEarliestFulfillmentDate(qMax),
    });
  }

  if (slowItems.length > 0) {
    const sMax = Math.max(...slowItems.map((i) => i.prep_lead_time_days));
    groups.push({
      label: "Needs more preparation",
      items: slowItems,
      maxLeadTime: sMax,
      earliestDate: getEarliestFulfillmentDate(sMax),
    });
  }

  return { isMixed: true, groups };
}
