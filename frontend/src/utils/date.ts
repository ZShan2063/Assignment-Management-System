const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const formatDate = (date: string) => DATE_FORMATTER.format(new Date(date));

export const formatDateOnly = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return DATE_FORMATTER.format(new Date(year, month - 1, day));
};
