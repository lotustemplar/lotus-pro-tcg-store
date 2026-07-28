import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { buildSocialMetadata } from "@/lib/metadata";
import { getSiteSettings } from "@/lib/site-settings";
import { STORE_CONFIG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CONFIG_REVALIDATE_SECONDS;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = "Contact Us";
  const description =
    "Reach out to Lotus Pro TCG for product questions, order help, or general support. We reply from our official store email.";

  return {
    title,
    description,
    ...buildSocialMetadata({
      title: `${title} | ${settings.brandName}`,
      description,
      path: "/contact",
      image: settings.logoSquareUrl,
      siteName: settings.brandName,
    }),
  };
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,28,102,0.82),rgba(10,14,24,0.98))] shadow-[0_24px_80px_rgba(3,8,20,0.42)]">
        <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200/85">
              Customer Support
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Contact {settings.brandName}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-200 sm:text-base">
              Questions about an order, a product, or an upcoming release? Send us a message here and it will
              go straight to our inbox. We will reply from our official {settings.brandName} domain email so
              the full conversation stays clean and easy to follow.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-100/80">
              What To Expect
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-gray-200">
              <p>Your message is delivered directly to the store inbox.</p>
              <p>You will instantly receive a confirmation email from our domain.</p>
              <p>When we answer, the reply stays inside the same email thread for a smooth customer experience.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,23,38,0.94),rgba(10,14,24,0.98))] p-6 shadow-[0_18px_44px_rgba(2,6,16,0.34)] sm:p-8">
          <h2 className="font-display text-3xl font-semibold text-white">Send us a message</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            Use the form below for order questions, shipping help, product requests, or anything else you need.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-[#0b111d] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
              Best Uses
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
              <li>Order questions or delivery concerns</li>
              <li>Product availability and restock requests</li>
              <li>Help choosing the right sealed product</li>
              <li>General store support and customer care</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-brand-400/20 bg-[linear-gradient(180deg,rgba(91,53,168,0.18),rgba(9,13,22,0.24))] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-200">
              Family-Run Support
            </p>
            <p className="mt-4 text-sm leading-7 text-gray-200">
              We built {settings.brandName} to feel personal, responsive, and collector-first. When you reach
              out, you are messaging real people behind the store.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
