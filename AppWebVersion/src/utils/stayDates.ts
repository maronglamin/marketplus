export function defaultCheckInDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(15, 0, 0, 0);
  return d;
}

export function defaultCheckOutDate(from?: Date): Date {
  const base = from ? new Date(from) : defaultCheckInDate();
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  return d;
}

export function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): Date {
  return new Date(value);
}

export function ensureCheckOutAfterCheckIn(checkIn: Date, checkOut: Date): Date {
  if (checkOut <= checkIn) {
    return defaultCheckOutDate(checkIn);
  }
  return checkOut;
}

export function formatStayDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
