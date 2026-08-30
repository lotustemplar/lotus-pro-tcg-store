"use client";

import { protectedMinBagValueCents, type MysteryRules } from "@/lib/mystery-bags";

type RuleField = [keyof MysteryRules, string, string, number | undefined, number | undefined, string];

const ruleFields: RuleField[] = [
  ["minPacksPerBag", "Minimum packs per bag", "3", 3, 6, "packs"],
  ["maxPacksPerBag", "Maximum packs per bag", "6", 3, 6, "packs"],
  ["bagCount", "Bags per batch", "24", 1, undefined, "bags"],
  ["productPriceCents", "Product price", "$32.99", 0, undefined, "money"],
  ["shippingCollectedCents", "Shipping collected", "$5.99", 0, undefined, "money"],
  ["postageCents", "Actual postage", "$8.00", 0, undefined, "money"],
  ["suppliesCents", "Supplies per bag", "$0.80", 0, undefined, "money"],
  ["paymentPercent", "Payment-processing rate", "2.9", 0, 100, "percent"],
  ["fixedPaymentFeeCents", "Fixed payment fee", "$0.30", 0, undefined, "money"],
  ["platformFeeCents", "Platform fee per bag", "$0.00", 0, undefined, "money"],
  ["minBagValueCents", "Minimum TCGplayer Market Value", "$25.00", 0, undefined, "money"],
  ["minBatchMarginPercent", "Minimum batch margin", "5", 0, 100, "percent"],
  ["marketValueBufferPercent", "Market swing buffer", "1", 0, 100, "percent"],
  ["basicOnlyBagCount", "Exact Basic-only bags", "15", 0, undefined, "bags"],
  ["premiumBagCount", "Exact Premium bags", "8", 0, undefined, "bags"],
  ["ultraPremiumBagCount", "Exact Ultra Premium bags", "1", 0, undefined, "bags"],
];

const booleanRules: Array<[keyof MysteryRules, string, string]> = [
  ["allowDuplicatePacks", "Allow duplicate packs in one bag", "Off means a pack row cannot repeat in the same bag."],
  ["allowDuplicateSets", "Allow duplicate sets in one bag", "Off means two packs from the same set cannot share a bag."],
  ["useEveryPack", "Use every available pack", "Strict mode assigns every active pack into complete bags."],
  ["leaveUnassigned", "Leave unused inventory unassigned", "Recommended when the batch should use only the inventory it can support profitably."],
];

export default function VariableRulesSection({ rules, updateRule }: { rules: MysteryRules; updateRule: (key: keyof MysteryRules, value: string | boolean) => void }) {
  const exactTotal = rules.basicOnlyBagCount + rules.premiumBagCount + rules.ultraPremiumBagCount;
  const total = rules.bagCount ?? exactTotal;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Batch rules</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">The optimizer creates the complete batch together, using TCGplayer Market Value as both customer-facing value and replacement-cost basis. A batch must have exact outcome counts, a $25 floor per bag, positive replacement-cost profit, and at least the configured margin.</p>
      </div>
      <div className="lux-panel grid gap-4 rounded-2xl p-5 sm:grid-cols-2 xl:grid-cols-3">
        {ruleFields.map(([key, label, placeholder, min, max, kind]) => {
          const value = key === "bagCount" && rules[key] === null ? "" : key.endsWith("Cents") ? Number(rules[key]) / 100 : rules[key] ?? "";
          const integer = kind === "packs" || kind === "bags";
          return <label key={key} className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}<input type="number" min={min} max={max} step={integer ? "1" : kind === "percent" ? "0.01" : "0.01"} value={typeof value === "boolean" ? "" : value} placeholder={placeholder} onChange={(event) => updateRule(key, event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-400" /></label>;
        })}
      </div>
      <div className={`rounded-xl border px-4 py-3 text-sm ${exactTotal === total ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-200" : "border-rose-400/30 bg-rose-400/5 text-rose-200"}`}>
        Exact outcome total: <strong>{exactTotal}</strong> of <strong>{total}</strong> bags. Premium specifically: {total ? ((rules.premiumBagCount / total) * 100).toFixed(4) : "0.0000"}%. Ultra Premium: {total ? ((rules.ultraPremiumBagCount / total) * 100).toFixed(4) : "0.0000"}%. Premium or better: {total ? (((rules.premiumBagCount + rules.ultraPremiumBagCount) / total) * 100).toFixed(4) : "0.0000"}%.
      </div>
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-6 text-gold/90"><strong>Protected value floor:</strong> the optimizer requires at least ${(protectedMinBagValueCents(rules) / 100).toFixed(2)} in each bag, calculated from the advertised ${(rules.minBagValueCents / 100).toFixed(2)} floor plus the {rules.marketValueBufferPercent ?? 0}% market-swing buffer.</div>
      <div className="lux-panel grid gap-3 rounded-2xl p-5 md:grid-cols-2">
        {booleanRules.map(([key, label, hint]) => <label key={key} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4"><input type="checkbox" checked={Boolean(rules[key])} onChange={(event) => updateRule(key, event.target.checked)} className="mt-1 h-4 w-4 accent-violet-500" /><span><span className="block text-sm font-semibold text-gray-200">{label}</span><span className="mt-1 block text-xs leading-5 text-gray-500">{hint}</span></span></label>)}
      </div>
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-6 text-gold/90"><strong>Accounting assumption:</strong> one bag per order. The percentage payment fee applies to product price plus shipping; one fixed payment fee, postage charge, and supplies cost are applied per bag. Replacement-cost profit treats the TCGplayer Market Value of included packs as their economic cost. This measures whether the product can sustain itself when inventory must be replaced at current market prices.</div>
    </div>
  );
}
