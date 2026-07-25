"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Other"] as const;

type ShipmentManagerProps = {
  orderId: string;
  customerEmail: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  trackingEmailSentAt: string | null;
  trackingEmailError: string | null;
};

type ShipmentResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

function formatTimestamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function ShipmentManager({
  orderId,
  customerEmail,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
  shippedAt,
  trackingEmailSentAt,
  trackingEmailError,
}: ShipmentManagerProps) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(trackingCarrier || "UPS");
  const [number, setNumber] = useState(trackingNumber || "");
  const [url, setUrl] = useState(trackingUrl || "");
  const [busyMode, setBusyMode] = useState<"save" | "email" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(sendEmail: boolean) {
    if (!number.trim()) {
      setMessage({ type: "error", text: "Tracking number is required." });
      return;
    }

    setBusyMode(sendEmail ? "email" : "save");
    setMessage(null);

    const response = await fetch(`/api/admin/orders/${orderId}/tracking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingCarrier: carrier,
        trackingNumber: number.trim(),
        trackingUrl: url.trim(),
        sendEmail,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ShipmentResponse;

    if (!response.ok) {
      setMessage({
        type: "error",
        text: typeof data.error === "string" ? data.error : "Unable to update shipment tracking.",
      });
      setBusyMode(null);
      router.refresh();
      return;
    }

    setMessage({
      type: "success",
      text: typeof data.message === "string" ? data.message : "Tracking updated.",
    });
    setBusyMode(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm text-gray-400">Tracking Carrier</label>
          <select
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          >
            {CARRIERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-400">Tracking Number</label>
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="1Z999AA10123456784"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-400">Tracking Link Override (optional)</label>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-white outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to auto-build a tracking link for UPS, USPS, FedEx, or DHL.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm text-gray-300">
        <p>Customer email: <span className="font-medium text-white">{customerEmail}</span></p>
        {url.trim() ? (
          <p className="mt-2 text-xs text-brand-300">
            <a href={url.trim()} target="_blank" rel="noreferrer" className="hover:text-brand-200 hover:underline">
              Open tracking link
            </a>
          </p>
        ) : null}
        {shippedAt ? <p className="mt-2 text-xs text-gray-500">Tracking saved: {formatTimestamp(shippedAt)}</p> : null}
        {trackingEmailSentAt ? (
          <p className="mt-1 text-xs text-emerald-300">Shipment email sent: {formatTimestamp(trackingEmailSentAt)}</p>
        ) : null}
        {trackingEmailError ? (
          <p className="mt-1 text-xs text-red-300">Last email attempt: {trackingEmailError}</p>
        ) : null}
      </div>

      {message ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success" ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busyMode !== null}
          onClick={() => submit(false)}
          className="rounded-lg border border-white/12 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-brand-400/50 hover:text-white disabled:opacity-60"
        >
          {busyMode === "save" ? "Saving..." : "Save Tracking"}
        </button>
        <button
          type="button"
          disabled={busyMode !== null}
          onClick={() => submit(true)}
          className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/10 hover:text-white disabled:opacity-60"
        >
          {busyMode === "email" ? "Sending..." : "Save + Send Thank You Email"}
        </button>
      </div>
    </div>
  );
}
