// Parse tags from any storage format:
//   JSON array: '["调试","部署"]'
//   Comma-separated: '调试,部署'
//   PostgreSQL array: '{调试,部署}'
//   Already an array: ['调试','部署']
// Returns a clean string array.
export function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === "string") {
    const s = tags.trim();
    if (!s) return [];
    // Try JSON array format
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
    // Try PostgreSQL array format: {item1,item2}
    if (s.startsWith("{") && s.endsWith("}")) {
      return s.slice(1, -1).split(",").map(t => t.trim()).filter(Boolean);
    }
    // Comma-separated string
    return s.split(",").map(t => t.trim()).filter(Boolean);
  }
  return [];
}
