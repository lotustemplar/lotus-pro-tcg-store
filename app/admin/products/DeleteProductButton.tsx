"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setBusy(true);
        const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        if (res.ok) router.refresh();
        else alert("Failed to delete product.");
        setBusy(false);
      }}
      className="text-red-400 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
