export const MYSTERY_TIERS = ["Basic", "Premium", "Ultra Premium"] as const;
export type MysteryTier = (typeof MYSTERY_TIERS)[number];
export type MysteryOutcome = "Basic-only" | "Premium" | "Ultra Premium";

export const MYSTERY_TIER_THRESHOLDS = { premiumCents: 800, ultraPremiumCents: 2500 } as const;

export function classifyMysteryTier(marketValueCents: number): MysteryTier {
  if (marketValueCents >= MYSTERY_TIER_THRESHOLDS.ultraPremiumCents) return "Ultra Premium";
  if (marketValueCents >= MYSTERY_TIER_THRESHOLDS.premiumCents) return "Premium";
  return "Basic";
}

export type MysteryPack = {
  id: string; name: string; setName: string; quantity: number; unitCostCents: number;
  marketValueCents: number; tier: MysteryTier; imageUrl?: string | null; tcgplayerUrl?: string | null;
};

export type MysteryRules = {
  costBasis: "market";
  /** @deprecated */ packsPerBag?: number;
  minPacksPerBag: number; maxPacksPerBag: number; productPriceCents: number; shippingCollectedCents: number;
  postageCents: number; suppliesCents: number; paymentPercent: number; fixedPaymentFeeCents: number;
  platformFeeCents: number; minBagValueCents: number; minBasicPacks: number; allowDuplicatePacks: boolean;
  allowDuplicateSets: boolean; maxCopiesSamePack: number; basicOnlyBagCount: number; premiumBagCount: number;
  ultraPremiumBagCount: number; minBatchMarginPercent: number; useEveryPack: boolean; leaveUnassigned: boolean;
  bagCount: number | null;
  /** Extra protection above the advertised floor for market movement. */
  marketValueBufferPercent?: number;
  /** @deprecated */ minBatchProfitCents?: number;
  /** @deprecated */ minAverageProfitCents?: number;
  /** @deprecated */ premiumOddsPercent?: number;
  /** @deprecated */ ultraOddsPercent?: number;
  /** @deprecated */ allowIndividualLosses?: boolean;
};

export const DEFAULT_MYSTERY_RULES: MysteryRules = {
  costBasis: "market", minPacksPerBag: 3, maxPacksPerBag: 6, productPriceCents: 3299,
  shippingCollectedCents: 599, postageCents: 800, suppliesCents: 80, paymentPercent: 2.9,
  fixedPaymentFeeCents: 30, platformFeeCents: 0, minBagValueCents: 2500, minBasicPacks: 1,
  allowDuplicatePacks: false, allowDuplicateSets: false, maxCopiesSamePack: 1, basicOnlyBagCount: 15,
  premiumBagCount: 8, ultraPremiumBagCount: 1, minBatchMarginPercent: 5, useEveryPack: false,
  leaveUnassigned: true, bagCount: 24,
  marketValueBufferPercent: 1,
};

export type BagAssignment = MysteryPack & { quantity: number };
export type GeneratedBag = { bagNumber: number; code: string; packs: BagAssignment[]; totalMarketValueCents: number; totalCostCents: number; profitCents: number; outcome: MysteryOutcome };
export type MysteryMetrics = {
  bagCount: number; totalProductRevenueCents: number; totalGrossRevenueCents: number; totalRevenueCents: number;
  totalPaymentFeesCents: number; totalPostageCents: number; totalSuppliesCents: number; totalPlatformFeesCents: number;
  netRevenueBeforePackCostsCents: number; totalInventoryCostCents: number; totalMarketValueCents: number;
  totalReplacementCostProfitCents: number; totalProfitCents: number; averageReplacementCostProfitCents: number;
  averageProfitCents: number; marginPercent: number; minimumRequiredProfitCents: number;
  maxAllowableMarketValueCents: number; remainingMarketValueRoomCents: number; breakEvenProductPriceCents: number;
  requiredProductPriceCents: number;
  averagePackCount: number; averageMarketValuePerBagCents: number; exactOutcomeCounts: Record<MysteryOutcome, number>;
};
export type MysteryClaim = { label: string; qualifyingBags: number; totalBags: number; fraction: string; percentage: number; refersTo: "pack" | "whole bag" };
export type OptimizerResult = { ok: true; bags: GeneratedBag[]; metrics: MysteryMetrics; claims: MysteryClaim[]; seed: string } | { ok: false; diagnostics: string[] };

const roundDivision = (numerator: number, denominator: number) => Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
const ceilDivision = (numerator: number, denominator: number) => Math.floor((numerator + denominator - 1) / denominator);

export function simplifyFraction(numerator: number, denominator: number) {
  if (numerator === 0) return `0/${denominator}`;
  const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function paymentRateBasisPoints(rules: MysteryRules) { return Math.max(0, Math.round(rules.paymentPercent * 100)); }
export function grossCollectedPerBagCents(rules: MysteryRules) { return rules.productPriceCents + rules.shippingCollectedCents; }
export function paymentFeeCents(rules: MysteryRules) { return roundDivision(grossCollectedPerBagCents(rules) * paymentRateBasisPoints(rules), 10000); }
export function netRevenueBeforePackCostsCents(rules: MysteryRules) {
  return grossCollectedPerBagCents(rules) - paymentFeeCents(rules) - rules.fixedPaymentFeeCents - rules.platformFeeCents - rules.postageCents - rules.suppliesCents;
}
export function protectedMinBagValueCents(rules: Pick<MysteryRules, "minBagValueCents" | "marketValueBufferPercent">) {
  const bufferBasisPoints = Math.max(0, Math.round((rules.marketValueBufferPercent ?? 0) * 100));
  return ceilDivision(rules.minBagValueCents * (10000 + bufferBasisPoints), 10000);
}
function marginPasses(profitCents: number, grossCents: number, marginPercent: number) { return profitCents * 10000 >= grossCents * Math.max(0, Math.round(marginPercent * 100)); }

function financeForContents(totalMarketValueCents: number, bagCount: number, rules: MysteryRules) {
  const grossCents = bagCount * grossCollectedPerBagCents(rules);
  const paymentFeesCents = bagCount * paymentFeeCents(rules);
  const netCents = grossCents - paymentFeesCents - bagCount * rules.fixedPaymentFeeCents - bagCount * rules.platformFeeCents - bagCount * rules.postageCents - bagCount * rules.suppliesCents;
  const minimumRequiredProfitCents = Math.max(1, ceilDivision(grossCents * Math.max(0, Math.round(rules.minBatchMarginPercent * 100)), 10000));
  const profitCents = netCents - totalMarketValueCents;
  return { grossCents, paymentFeesCents, netCents, minimumRequiredProfitCents, profitCents, maxAllowableMarketValueCents: netCents - minimumRequiredProfitCents };
}

function requiredProductPriceForContents(totalMarketValueCents: number, bagCount: number, rules: MysteryRules, marginPercent: number) {
  let low = 0; let high = 1000000;
  const passes = (productPriceCents: number) => {
    const finance = financeForContents(totalMarketValueCents, bagCount, { ...rules, productPriceCents, minBatchMarginPercent: marginPercent });
    return finance.profitCents > 0 && marginPasses(finance.profitCents, finance.grossCents, marginPercent);
  };
  if (!passes(high)) return high;
  while (low < high) { const middle = Math.floor((low + high) / 2); if (passes(middle)) high = middle; else low = middle + 1; }
  return low;
}

export function requiredProductPriceCents(bags: GeneratedBag[], rules: MysteryRules) {
  return requiredProductPriceForContents(bags.reduce((sum, bag) => sum + bag.totalMarketValueCents, 0), bags.length, rules, rules.minBatchMarginPercent);
}
export function breakEvenProductPriceCents(rules: MysteryRules, averagePackCostCents: number) { return requiredProductPriceForContents(averagePackCostCents, 1, rules, 0); }

export function calculateMysteryMetrics(bags: GeneratedBag[], rules: MysteryRules): MysteryMetrics {
  const bagCount = bags.length;
  const totalMarketValueCents = bags.reduce((sum, bag) => sum + bag.totalMarketValueCents, 0);
  const finance = financeForContents(totalMarketValueCents, bagCount, rules);
  const packCount = bags.reduce((sum, bag) => sum + bag.packs.reduce((inner, pack) => inner + pack.quantity, 0), 0);
  const exactOutcomeCounts: Record<MysteryOutcome, number> = { "Basic-only": 0, Premium: 0, "Ultra Premium": 0 };
  for (const bag of bags) exactOutcomeCounts[bag.outcome] += 1;
  const marginPercent = finance.grossCents > 0 ? Number(((finance.profitCents * 10000 / finance.grossCents) / 100).toFixed(4)) : 0;
  return {
    bagCount, totalProductRevenueCents: bagCount * rules.productPriceCents, totalGrossRevenueCents: finance.grossCents, totalRevenueCents: finance.grossCents,
    totalPaymentFeesCents: finance.paymentFeesCents, totalPostageCents: bagCount * rules.postageCents, totalSuppliesCents: bagCount * rules.suppliesCents,
    totalPlatformFeesCents: bagCount * rules.platformFeeCents, netRevenueBeforePackCostsCents: finance.netCents, totalInventoryCostCents: totalMarketValueCents,
    totalMarketValueCents, totalReplacementCostProfitCents: finance.profitCents, totalProfitCents: finance.profitCents,
    averageReplacementCostProfitCents: bagCount ? Math.round(finance.profitCents / bagCount) : 0, averageProfitCents: bagCount ? Math.round(finance.profitCents / bagCount) : 0,
    marginPercent, minimumRequiredProfitCents: finance.minimumRequiredProfitCents, maxAllowableMarketValueCents: finance.maxAllowableMarketValueCents,
    remainingMarketValueRoomCents: finance.maxAllowableMarketValueCents - totalMarketValueCents,
    breakEvenProductPriceCents: requiredProductPriceForContents(totalMarketValueCents, bagCount, rules, 0),
    requiredProductPriceCents: requiredProductPriceForContents(totalMarketValueCents, bagCount, rules, rules.minBatchMarginPercent),
    averagePackCount: bagCount ? Number((packCount / bagCount).toFixed(4)) : 0,
    averageMarketValuePerBagCents: bagCount ? Number((totalMarketValueCents / bagCount).toFixed(2)) : 0, exactOutcomeCounts,
  };
}

function claim(label: string, qualifyingBags: number, totalBags: number): MysteryClaim { return { label, qualifyingBags, totalBags, fraction: simplifyFraction(qualifyingBags, totalBags), percentage: Number(((qualifyingBags / totalBags) * 100).toFixed(4)), refersTo: "whole bag" }; }
export function buildTruthfulClaims(bags: GeneratedBag[]): MysteryClaim[] {
  const total = bags.length; if (!total) return [];
  const counts: Record<MysteryOutcome, number> = { "Basic-only": 0, Premium: 0, "Ultra Premium": 0 };
  for (const bag of bags) counts[bag.outcome] += 1;
  const packCounts = bags.map((bag) => bag.packs.reduce((sum, pack) => sum + pack.quantity, 0));
  const min = Math.min(...packCounts); const max = Math.max(...packCounts);
  return [
    claim(min === max ? `Every bag contains ${min} sealed booster packs` : `Every bag contains ${min}-${max} sealed booster packs`, total, total),
    claim("Basic-only bag", counts["Basic-only"], total), claim("Premium bag", counts.Premium, total), claim("Ultra Premium bag", counts["Ultra Premium"], total),
    claim("Premium specifically", counts.Premium, total), claim("Ultra Premium", counts["Ultra Premium"], total), claim("Premium or better", counts.Premium + counts["Ultra Premium"], total),
  ];
}

function diagnosticsFor(rules: MysteryRules, packs: MysteryPack[], bagCount: number) {
  const units = packs.reduce((sum, pack) => sum + pack.quantity, 0); const expected = rules.basicOnlyBagCount + rules.premiumBagCount + rules.ultraPremiumBagCount; const diagnostics: string[] = [];
  if (rules.minPacksPerBag < 3 || rules.minPacksPerBag > 6) diagnostics.push("Minimum packs per bag must be between 3 and 6.");
  if (rules.maxPacksPerBag < 3 || rules.maxPacksPerBag > 6) diagnostics.push("Maximum packs per bag must be between 3 and 6.");
  if (rules.maxPacksPerBag < rules.minPacksPerBag) diagnostics.push("Maximum packs per bag cannot be lower than the minimum.");
  if (expected !== bagCount) diagnostics.push(`Exact outcome counts must add up to ${bagCount} bags.`);
  if (rules.minBasicPacks > rules.maxPacksPerBag) diagnostics.push("The Basic-pack requirement is larger than the maximum bag size.");
  if (units < bagCount * rules.minPacksPerBag) diagnostics.push(`Inventory shortage: ${bagCount * rules.minPacksPerBag - units} more pack(s) are required to meet the minimum bag size.`);
  if (rules.useEveryPack && units > bagCount * rules.maxPacksPerBag) diagnostics.push(`Strict use-every-pack mode has ${units - bagCount * rules.maxPacksPerBag} too many packs for ${bagCount} bags.`);
  const countTier = (tier: MysteryTier) => packs.filter((pack) => pack.tier === tier).reduce((sum, pack) => sum + pack.quantity, 0);
  if (countTier("Basic") < bagCount * rules.minBasicPacks) diagnostics.push("Insufficient Basic packs for the selected bag count.");
  if (countTier("Premium") < rules.premiumBagCount) diagnostics.push(`Insufficient Premium packs for exactly ${rules.premiumBagCount} Premium bags.`);
  if (countTier("Ultra Premium") < rules.ultraPremiumBagCount) diagnostics.push(`Insufficient Ultra Premium packs for exactly ${rules.ultraPremiumBagCount} Ultra Premium bags.`);
  if (rules.minBatchMarginPercent < 0 || rules.minBatchMarginPercent > 100) diagnostics.push("Minimum batch margin must be between 0% and 100%.");
  return diagnostics;
}

type Candidate = { packs: BagAssignment[]; usage: number[]; valueCents: number; balancePenaltyCents: number };
function generateCandidates(packs: MysteryPack[], outcome: MysteryOutcome, rules: MysteryRules, ultraAnchorCents: number | null): Candidate[] {
  const candidates: Candidate[] = []; const usage = packs.map(() => 0); const selected: Array<{ index: number; quantity: number }> = [];
  const visit = (index: number, count: number, valueCents: number, basicCount: number, hasPremium: boolean, hasUltra: boolean, sets: Set<string>) => {
    if (count > rules.maxPacksPerBag) return;
    if (index === packs.length) {
      const validTier = outcome === "Basic-only" ? !hasPremium && !hasUltra : outcome === "Premium" ? hasPremium && !hasUltra : hasUltra;
      if (count < rules.minPacksPerBag || valueCents < protectedMinBagValueCents(rules) || basicCount < rules.minBasicPacks || !validTier) return;
      const selectedPacks = selected.map(({ index: selectedIndex, quantity }) => ({ ...packs[selectedIndex], quantity }));
      const anchor = selectedPacks.find((pack) => pack.tier === "Ultra Premium");
      candidates.push({ packs: selectedPacks, usage: [...usage], valueCents, balancePenaltyCents: outcome === "Ultra Premium" && anchor && ultraAnchorCents !== null ? Math.abs(anchor.marketValueCents - ultraAnchorCents) * 3 : 0 }); return;
    }
    const pack = packs[index]; const maximum = rules.allowDuplicatePacks ? Math.min(pack.quantity, rules.maxCopiesSamePack, rules.maxPacksPerBag - count) : Math.min(1, rules.maxPacksPerBag - count);
    for (let quantity = 0; quantity <= maximum; quantity += 1) {
      if (quantity > 0 && !rules.allowDuplicateSets && (sets.has(pack.setName) || quantity > 1)) continue;
      if (quantity === 0) { visit(index + 1, count, valueCents, basicCount, hasPremium, hasUltra, sets); continue; }
      usage[index] = quantity; selected.push({ index, quantity }); const nextSets = new Set(sets); nextSets.add(pack.setName);
      visit(index + 1, count + quantity, valueCents + quantity * pack.marketValueCents, basicCount + (pack.tier === "Basic" ? quantity : 0), hasPremium || pack.tier === "Premium", hasUltra || pack.tier === "Ultra Premium", nextSets);
      selected.pop(); usage[index] = 0;
    }
  };
  visit(0, 0, 0, 0, false, false, new Set());
  const unique = new Map<string, Candidate>(); for (const candidate of candidates) unique.set(candidate.usage.join(","), candidate);
  return [...unique.values()].sort((a, b) => a.valueCents - b.valueCents);
}

function optimizeCandidates(packs: MysteryPack[], rules: MysteryRules, bagCount: number) {
  const ultraValues = packs.filter((pack) => pack.tier === "Ultra Premium").map((pack) => pack.marketValueCents).sort((a, b) => a - b);
  const ultraAnchorCents = ultraValues.length ? ultraValues[Math.floor(ultraValues.length / 2)] : null;
  const allUltraCandidates = generateCandidates(packs, "Ultra Premium", rules, ultraAnchorCents);
  // A singleton Ultra Premium slot should rotate through the middle of the
  // available Ultra values instead of always consuming the cheapest row.
  // This keeps high-value inventory visible while preserving a fallback when
  // the preferred anchor cannot produce a profitable batch.
  const balancedUltraCandidates = ultraAnchorCents === null ? [] : allUltraCandidates.filter((candidate) => candidate.packs.some((pack) => pack.tier === "Ultra Premium" && pack.marketValueCents === ultraAnchorCents));
  const candidates: Record<MysteryOutcome, Candidate[]> = { "Basic-only": generateCandidates(packs, "Basic-only", rules, ultraAnchorCents), Premium: generateCandidates(packs, "Premium", rules, ultraAnchorCents), "Ultra Premium": balancedUltraCandidates.length ? balancedUltraCandidates : allUltraCandidates };
  const sequence: MysteryOutcome[] = [...Array.from({ length: rules.ultraPremiumBagCount }, () => "Ultra Premium" as const), ...Array.from({ length: rules.premiumBagCount }, () => "Premium" as const), ...Array.from({ length: rules.basicOnlyBagCount }, () => "Basic-only" as const)];
  for (const outcome of ["Basic-only", "Premium", "Ultra Premium"] as const) if (sequence.includes(outcome) && !candidates[outcome].length) return { bags: null, reason: `No valid ${outcome} bag can satisfy the pack count, Basic requirement, duplicate rules, and $${(protectedMinBagValueCents(rules) / 100).toFixed(2)} protected TCGplayer Market Value floor.` };
  const maxAllowableMarketValueCents = financeForContents(0, bagCount, rules).maxAllowableMarketValueCents;
  type State = { used: number[]; costCents: number; balancePenaltyCents: number; bags: Candidate[] }; let states: State[] = [{ used: packs.map(() => 0), costCents: 0, balancePenaltyCents: 0, bags: [] }]; const beamWidth = 2000;
  for (const outcome of sequence) {
    const nextByUsage = new Map<string, State>();
    for (const state of states) for (const candidate of candidates[outcome]) {
      if (!candidate.usage.every((quantity, index) => state.used[index] + quantity <= packs[index].quantity)) continue;
      const used = state.used.map((quantity, index) => quantity + candidate.usage[index]); const costCents = state.costCents + candidate.valueCents;
      if (costCents > maxAllowableMarketValueCents) continue;
      const next: State = { used, costCents, balancePenaltyCents: state.balancePenaltyCents + candidate.balancePenaltyCents, bags: [...state.bags, candidate] }; const old = nextByUsage.get(used.join(","));
      if (!old || next.costCents < old.costCents) nextByUsage.set(used.join(","), next);
    }
    const uniqueStates = [...nextByUsage.values()];
    const lowCostStates = [...uniqueStates].sort((a, b) => a.costCents - b.costCents).slice(0, Math.floor(beamWidth / 2));
    const rank = (state: State) => state.costCents - state.balancePenaltyCents;
    const highValueStates = [...uniqueStates].sort((a, b) => rank(b) - rank(a)).slice(0, Math.ceil(beamWidth / 2));
    states = [...new Map([...lowCostStates, ...highValueStates].map((state) => [state.used.join(","), state])).values()];
    if (!states.length) return { bags: null, reason: "Inventory quantities or duplicate restrictions cannot support the exact requested outcome counts within the batch profit ceiling." };
  }
  const ranked = [...states].sort((a, b) => (b.costCents - b.balancePenaltyCents) - (a.costCents - a.balancePenaltyCents));
  const best = rules.useEveryPack ? ranked.find((state) => state.used.every((quantity, index) => quantity === packs[index].quantity)) : ranked[0];
  return { bags: best?.bags ?? null, reason: best ? null : "Strict use-every-pack mode cannot assign every inventory pack into complete bags while respecting the exact outcomes, pack counts, value floor, and duplicate rules." };
}

export function optimizeMysteryBatch(inputPacks: MysteryPack[], rules: MysteryRules, requestedSeed?: string): OptimizerResult {
  const seed = requestedSeed ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const packs = shuffled(inputPacks.map((pack) => ({ ...pack, tier: classifyMysteryTier(pack.marketValueCents) })).filter((pack) => pack.quantity > 0 && pack.marketValueCents >= 0 && pack.unitCostCents >= 0), seed);
  const bagCount = rules.bagCount ?? rules.basicOnlyBagCount + rules.premiumBagCount + rules.ultraPremiumBagCount; const diagnostics = diagnosticsFor(rules, packs, bagCount); if (diagnostics.length) return { ok: false, diagnostics };
  const optimized = optimizeCandidates(packs, rules, bagCount); if (!optimized.bags) return { ok: false, diagnostics: [optimized.reason ?? "No valid batch could be generated."] };
  const netPerBag = netRevenueBeforePackCostsCents(rules); const bags: GeneratedBag[] = optimized.bags.map((candidate, index) => { const outcome = candidate.packs.some((pack) => pack.tier === "Ultra Premium") ? "Ultra Premium" : candidate.packs.some((pack) => pack.tier === "Premium") ? "Premium" : "Basic-only"; return { bagNumber: index + 1, code: `LMB-${seed.slice(-6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`, packs: candidate.packs, totalMarketValueCents: candidate.valueCents, totalCostCents: candidate.valueCents, profitCents: netPerBag - candidate.valueCents, outcome }; });
  if (rules.useEveryPack) { const assigned = optimized.bags.reduce((sum, candidate) => sum + candidate.usage.reduce((inner, quantity) => inner + quantity, 0), 0); const available = packs.reduce((sum, pack) => sum + pack.quantity, 0); if (assigned !== available) return { ok: false, diagnostics: [`${available - assigned} pack(s) remain unassigned in strict use-every-pack mode.`] }; }
  const metrics = calculateMysteryMetrics(bags, rules); if (metrics.remainingMarketValueRoomCents < 0) return { ok: false, diagnostics: [`This batch exceeds the maximum allowable TCGplayer Market Value by $${(Math.abs(metrics.remainingMarketValueRoomCents) / 100).toFixed(2)}.`, `Maximum allowable batch TCGplayer Market Value is $${(metrics.maxAllowableMarketValueCents / 100).toFixed(2)}.`] };
  if (metrics.totalReplacementCostProfitCents <= 0) return { ok: false, diagnostics: [`This batch produces replacement-cost profit of $${(metrics.totalReplacementCostProfitCents / 100).toFixed(2)}, which must be greater than $0.00.`] };
  if (!marginPasses(metrics.totalReplacementCostProfitCents, metrics.totalGrossRevenueCents, rules.minBatchMarginPercent)) return { ok: false, diagnostics: [`This batch produces a replacement-cost margin of ${metrics.marginPercent}%, below the required ${rules.minBatchMarginPercent}%.`] };
  return { ok: true, bags, metrics, claims: buildTruthfulClaims(bags), seed };
}

function shuffled<T>(items: T[], seed: string) { let state = Array.from(seed).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 2166136261); const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { state = (1664525 * state + 1013904223) >>> 0; const j = state % (i + 1); [result[i], result[j]] = [result[j], result[i]]; } return result; }
