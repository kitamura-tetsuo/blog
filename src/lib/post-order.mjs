// A documented first-merge time is a fallback, not a claimed production publication time.
export function orderTime(post) {
  const { publishedAt, firstMergedAt, date } = post.data;
  return publishedAt ? Date.parse(publishedAt) : firstMergedAt ? Date.parse(firstMergedAt) : date.valueOf();
}

export function newestFirst(a, b) {
  const difference = orderTime(b) - orderTime(a);
  // A documented relative order breaks equal-time ties; exact timestamps still take precedence.
  const relativeOrder = (b.data.orderWithinTimestamp ?? 0) - (a.data.orderWithinTimestamp ?? 0);
  return difference || relativeOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
