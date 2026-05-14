import naija from "naija-state-local-government";

export function getStates(): string[] {
  try {
    const states = (naija as { states?: () => string[] }).states?.();
    if (Array.isArray(states)) return states;
  } catch {
    // fall through
  }
  return [];
}

export function getLgas(state: string): string[] {
  if (!state) return [];
  try {
    const result = (naija as { lgas?: (s: string) => { lgas?: string[] } | string[] }).lgas?.(state);
    if (Array.isArray(result)) return result;
    if (result && typeof result === "object" && Array.isArray(result.lgas)) return result.lgas;
  } catch {
    // fall through
  }
  return [];
}
