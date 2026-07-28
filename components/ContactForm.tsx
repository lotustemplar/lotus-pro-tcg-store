"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export function ContactForm() {
  const [values, setValues] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to send your message.");
      }

      setValues(EMPTY_FORM);
      setStatus("success");
      setMessage("Your message was sent. Check your inbox for our confirmation email.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send your message.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-200">Name</span>
          <input
            required
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0a1120] px-4 py-3 text-white outline-none transition focus:border-brand-400"
            placeholder="Your name"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-200">Email</span>
          <input
            required
            type="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0a1120] px-4 py-3 text-white outline-none transition focus:border-brand-400"
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-gray-200">Subject</span>
        <input
          required
          value={values.subject}
          onChange={(event) => update("subject", event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0a1120] px-4 py-3 text-white outline-none transition focus:border-brand-400"
          placeholder="How can we help?"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-gray-200">Message</span>
        <textarea
          required
          rows={7}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#0a1120] px-4 py-3 text-white outline-none transition focus:border-brand-400"
          placeholder="Tell us what you need and we will get back to you as soon as we can."
        />
      </label>

      <label className="hidden" aria-hidden="true">
        <span>Website</span>
        <input
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </label>

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
          Replies come from our official Lotus Pro TCG email.
        </p>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl border border-brand-300/70 bg-[linear-gradient(135deg,rgba(124,58,237,0.95),rgba(79,38,161,0.95))] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(139,92,246,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
