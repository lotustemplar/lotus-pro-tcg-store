"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="mt-1 block w-full rounded-md px-3 py-2 text-left text-xs text-gray-500 hover:bg-bg-elevated hover:text-red-400"
    >
      Log out
    </button>
  );
}
