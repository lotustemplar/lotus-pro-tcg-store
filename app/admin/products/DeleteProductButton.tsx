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
        if (!confirm(`Remove "${name}" from the active catalog? This hides it from the store and admin list.`)) return;
        setBusy(true);
        const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (typeof data.message === "string" && data.message.trim().length > 0) {
            alert(data.message);
          }
          router.refresh();
        } else {
          alert(typeof data.error === "string" ? data.error : "Failed to delete product.");
        }
        setBusy(false);
      }}
      className="text-red-400 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}
