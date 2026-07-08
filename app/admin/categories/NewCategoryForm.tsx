"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/format";

export function NewCategoryForm({
  topLevelCategories,
}: {
  topLevelCategories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [navStyle, setNavStyle] = useState<"default" | "patreon">("default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slugify(name),
        parentId: parentId || null,
        navStyle,
      }),
    });
    if (res.ok) {
      setName("");
      router.refresh();
    } else {
      setError("Failed to create category — the slug may already exist under that parent.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-gray-400">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Parent (leave blank for top-level menu item)</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          <option value="">— Top-level menu item —</option>
          {topLevelCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-400">Nav style</label>
        <select
          value={navStyle}
          onChange={(e) => setNavStyle(e.target.value as "default" | "patreon")}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          <option value="default">Default</option>
          <option value="patreon">Patreon-style (gold highlight)</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {saving ? "Adding..." : "Add"}
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </form>
  );
}
