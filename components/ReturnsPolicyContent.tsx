export function ReturnsPolicyContent({ brandName }: { brandName: string }) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(92,30,30,0.82),rgba(10,14,24,0.98))] shadow-[0_24px_80px_rgba(3,8,20,0.42)]">
        <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-200/90">
              Returns & Refund Policy
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
              All sales are final.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-200 sm:text-base">
              Due to the nature of trading cards, sealed TCG product, and accessories, {brandName} does not
              accept returns and does not issue refunds on these items. This final-sale policy helps protect
              against fraud, product tampering, box mapping, card swapping, counterfeits, and other forms of
              abuse that are common in the hobby.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-100/85">
              Effective Policy
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-gray-200">
              <p>Effective date: July 31, 2026.</p>
              <p>Trading cards, sealed product, and accessories are sold on a strict final-sale basis.</p>
              <p>Do not send any item back unless we have explicitly instructed you to do so in writing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)]">
          <h2 className="font-display text-2xl font-medium text-white">No Returns</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            We do not accept returns on trading cards, sealed trading card game products, card supplies, or
            accessories. Once an order is placed and fulfilled, it is considered final.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)]">
          <h2 className="font-display text-2xl font-medium text-white">No Refunds</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            We do not issue refunds for buyer&apos;s remorse, accidental purchases, price changes, pull results,
            minor packaging wear, or personal preference. The collectible nature of these products makes refund
            abuse too easy to exploit.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)]">
          <h2 className="font-display text-2xl font-medium text-white">Fraud Prevention</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            This policy exists to combat counterfeit cards, tampering, resealed products, part swaps, and
            other fraudulent behavior. Final-sale terms allow us to protect the integrity of our inventory and
            our customers.
          </p>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#0b111d] p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold text-white">Detailed Final-Sale Terms</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-gray-300">
              <p>
                All trading cards, sealed TCG product, deck boxes, sleeves, binders, playmats, and related
                accessories sold by {brandName} are final sale. By placing an order, you acknowledge and agree
                that these items are not eligible for return, exchange, store credit, or refund.
              </p>
              <p>
                We do not accept returns because collectible products can be searched, opened, swapped,
                tampered with, resealed, or otherwise altered after delivery in ways that are not always
                detectable. Even when an item appears unused, the risk to inventory authenticity is too high.
              </p>
              <p>
                Refunds will not be issued because a card did not grade as expected, a sealed box did not
                contain the cards a customer hoped for, market values changed after purchase, a release became
                easier or harder to find, or a buyer later decided the item was no longer wanted.
              </p>
              <p>
                Packaging supplied by manufacturers may show small cosmetic imperfections, shelf wear, tight
                seals, print variance, or normal transit wear. Unless the item is clearly the wrong product
                shipped by our store, these issues do not qualify for a refund or return.
              </p>
              <p>
                Any attempt to initiate a chargeback or payment dispute in contradiction of this posted final
                sale policy may be challenged with order records, product details, shipment confirmation,
                delivery scans, and this published policy.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-red-400/20 bg-[linear-gradient(180deg,rgba(120,35,35,0.18),rgba(9,13,22,0.24))] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">
              Important Exceptions
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-gray-200">
              <p>
                If we shipped the wrong item, or if your order arrives with a clear fulfillment problem caused
                by us, contact us promptly so we can review it.
              </p>
              <p>
                Any such issue must be reported within 3 calendar days of delivery, and we may request photos
                of the shipping box, label, packing materials, and product before making any determination.
              </p>
              <p>
                No return is authorized without prior written approval from {brandName}. Unauthorized return
                shipments may be refused.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)]">
        <h2 className="font-display text-2xl font-medium text-white">Customer Acknowledgment</h2>
        <p className="mt-4 text-sm leading-7 text-gray-300">
          By completing a purchase from {brandName}, you acknowledge that you have read, understood, and
          agreed to this Returns & Refund Policy. All sales are final for trading cards, sealed product, and
          accessories.
        </p>
      </section>
    </div>
  );
}
