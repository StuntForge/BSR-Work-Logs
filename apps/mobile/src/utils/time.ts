// Calendar-aware elapsed time breakdown, used for the live-ticking Time Served clock
// (spec §3: "deliberate gamification detail" — must include ticking seconds).
export function computeElapsed(start: Date, now: Date) {
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  let hours = now.getHours() - start.getHours();
  let minutes = now.getMinutes() - start.getMinutes();
  let seconds = now.getSeconds() - start.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  return { years, months, days, hours, minutes, seconds };
}

export function formatElapsed(e: ReturnType<typeof computeElapsed>) {
  const parts: string[] = [];
  if (e.years > 0) parts.push(`${e.years} year${e.years === 1 ? "" : "s"}`);
  if (e.months > 0 || e.years > 0) parts.push(`${e.months} month${e.months === 1 ? "" : "s"}`);
  parts.push(`${e.days} day${e.days === 1 ? "" : "s"}`);
  const clock = [e.hours, e.minutes, e.seconds].map((n) => String(n).padStart(2, "0")).join(":");
  return `${parts.join(", ")}, ${clock}`;
}
