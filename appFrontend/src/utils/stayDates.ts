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

export function ensureCheckOutAfterCheckIn(checkIn: Date, checkOut: Date): Date {
  if (checkOut <= checkIn) {
    return defaultCheckOutDate(checkIn);
  }
  return checkOut;
}
