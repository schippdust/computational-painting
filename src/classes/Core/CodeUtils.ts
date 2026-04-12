export function prependUniqueWithLimit<T>(
  list: T[],
  newItem: T,
  maxLength: number,
) {
  if (!list.includes(newItem)) {
    list.unshift(newItem);
  }

  if (list.length > maxLength) {
    list.length = maxLength;
  }

  return list;
}
