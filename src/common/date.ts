const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getChinaDateString(date = new Date()) {
  return new Date(date.getTime() + CHINA_TIME_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function getChinaDateRange(dateInput?: string) {
  const date = dateInput || getChinaDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('invalid date');
  }

  const start = new Date(`${date}T00:00:00.000+08:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { date, start, end };
}
