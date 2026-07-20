export type ResourceKind = "food" | "wood" | "stone";

export const RESOURCE_KINDS: readonly ResourceKind[] = ["food", "wood", "stone"];

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  food: "Food",
  wood: "Wood",
  stone: "Stone",
};

export const STARTING_RESOURCES: Record<ResourceKind, number> = {
  food: 20,
  wood: 15,
  stone: 10,
};

export type ResourceStock = Record<ResourceKind, number>;

export function canAfford(stock: ResourceStock, cost: Partial<ResourceStock>): boolean {
  return (Object.entries(cost) as [ResourceKind, number][]).every(([kind, amount]) => stock[kind] >= amount);
}

export function deductCost(stock: ResourceStock, cost: Partial<ResourceStock>): ResourceStock {
  const next = { ...stock };
  for (const [kind, amount] of Object.entries(cost) as [ResourceKind, number][]) {
    next[kind] -= amount;
  }
  return next;
}
