export type ChronicleKind = "departure" | "discovery" | "construction";

export interface ChronicleLocation {
  q: number;
  r: number;
}

export interface ChronicleEntry {
  id: string;
  sequence: number;
  kind: ChronicleKind;
  summary: string;
  location: ChronicleLocation | null;
  discoveryId?: string;
  rewardText?: string;
}

export function createChronicleEntry(entry: Omit<ChronicleEntry, "id">): ChronicleEntry {
  return { id: `chronicle-${entry.sequence}-${entry.kind}`, ...entry };
}
