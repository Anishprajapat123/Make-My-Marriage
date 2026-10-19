/** Resolve local wall time without relying on the server's time zone. Reject DST gaps/ambiguity. */
export function localToUtc(date: string, time: string, timezone: string) {
  const target = `${date}T${time}`;
  const wall = Date.parse(`${target}:00Z`);
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = (ms: number) =>
    Object.fromEntries(format.formatToParts(ms).map((p) => [p.type, p.value]));
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const ms = wall + delta;
    const p = parts(ms);
    offsets.add(
      Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`) -
        ms,
    );
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((ms) => {
      const p = parts(ms);
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === target;
    });
  if (candidates.length !== 1)
    throw new Error(
      candidates.length
        ? "This local time occurs twice due to daylight saving. Choose an unambiguous time."
        : "This local time does not exist due to daylight saving. Choose another time.",
    );
  return new Date(candidates[0]);
}
export function localParts(iso: string, timezone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function formatEventTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
