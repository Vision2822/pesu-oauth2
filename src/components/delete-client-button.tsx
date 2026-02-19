"use client";

import { deleteClientAction } from "@/app/admin/action";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  return (
    <form
      action={deleteClientAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${clientName}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={clientId} />
      <button type="submit" className="btn btn-sm btn-danger">
        Delete
      </button>
    </form>
  );
}