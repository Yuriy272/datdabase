export function applyChange(list, payload, key) {
  const rec = payload.new || payload.old;
  if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
    const i = list.findIndex((x) => x[key] === rec[key]);
    if (i >= 0) { const cp = [...list]; cp[i] = rec; return cp; }
    return [rec, ...list];
  }
  if (payload.eventType === "DELETE") return list.filter((x) => x[key] !== rec[key]);
  return list;
}
