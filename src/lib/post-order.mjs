// A documented first-merge time is a fallback, not a claimed production publication time.
export function orderTime(post) {
  const { publishedAt, firstMergedAt, date } = post.data;
  return publishedAt ? Date.parse(publishedAt) : firstMergedAt ? Date.parse(firstMergedAt) : date.valueOf();
}

export function newestFirst(a, b) {
  const difference = orderTime(b) - orderTime(a);
  // Identical or unknown times need a stable order independent of file traversal.
  return difference || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
