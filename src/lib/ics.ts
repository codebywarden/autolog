export interface IcsJob {
  id: string;
  vrm: string;
  notes: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string | null; // HH:MM:SS, or null for an all-day event
  contactInfo: string | null;
}

const DEFAULT_DURATION_HOURS = 1;

// RFC 5545 §3.3.11 — comma, semicolon, and backslash need escaping, and
// literal newlines become the two-character \n sequence.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

// RFC 5545 §3.1 — lines over 75 octets must be folded onto a continuation
// line starting with a single space. Most calendar clients tolerate long
// lines anyway, but folding is cheap enough to just do properly.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n ");
}

function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Floating local date-times (no Z suffix, no TZID) rather than a proper
 * UK-timezone conversion — this app has no timezone database handling,
 * and a floating time reads back as "9am" on whatever device opens the
 * feed, which is close enough for a UK-only garage scheduling tool
 * without pulling in DST-aware conversion for one field.
 */
export function buildWorkRequestIcsFeed(
  calendarName: string,
  jobs: IcsJob[],
): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Motor360//Garage Jobs//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(calendarName)}`),
  ];

  for (const job of jobs) {
    const datePart = job.scheduledDate.replace(/-/g, "");
    const summary = `${job.vrm} — ${job.notes.slice(0, 80)}`;
    const descriptionParts = [job.notes];
    if (job.contactInfo) descriptionParts.push(`Contact: ${job.contactInfo}`);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${job.id}@motor360`);
    lines.push(`DTSTAMP:${formatUtcStamp(now)}`);

    if (job.scheduledTime) {
      const timePart = job.scheduledTime.replace(/:/g, "").slice(0, 6);
      const start = new Date(`${job.scheduledDate}T${job.scheduledTime}`);
      const end = new Date(
        start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000,
      );
      const endDatePart = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, "0")}${String(end.getDate()).padStart(2, "0")}`;
      const endTimePart = `${String(end.getHours()).padStart(2, "0")}${String(end.getMinutes()).padStart(2, "0")}${String(end.getSeconds()).padStart(2, "0")}`;
      lines.push(`DTSTART:${datePart}T${timePart}`);
      lines.push(`DTEND:${endDatePart}T${endTimePart}`);
    } else {
      // All-day event — DTEND is exclusive per spec, so it's the next day.
      const start = new Date(`${job.scheduledDate}T00:00:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const endDatePart = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, "0")}${String(end.getDate()).padStart(2, "0")}`;
      lines.push(`DTSTART;VALUE=DATE:${datePart}`);
      lines.push(`DTEND;VALUE=DATE:${endDatePart}`);
    }

    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`));
    lines.push(foldLine(`DESCRIPTION:${escapeText(descriptionParts.join("\n"))}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
