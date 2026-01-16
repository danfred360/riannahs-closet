import { useState, useEffect } from "react";
import { subscribeSyncQueue, SyncOperation } from "@/lib/sync-queue";

const ITEM_OPERATIONS = ["create_item", "update_item", "delete_item"];
const OUTFIT_OPERATIONS = ["create_outfit", "update_outfit", "delete_outfit", "create_planned_outfit", "delete_planned_outfit"];

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [outfitCount, setOutfitCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeSyncQueue((queue: SyncOperation[]) => {
      const activeOps = queue.filter((op) => op.status === "pending" || op.status === "syncing");
      const syncing = queue.filter((op) => op.status === "syncing").length;
      const failed = queue.filter((op) => op.status === "failed").length;
      
      const items = activeOps.filter((op) => ITEM_OPERATIONS.includes(op.type)).length;
      const outfits = activeOps.filter((op) => OUTFIT_OPERATIONS.includes(op.type)).length;
      
      setPendingCount(items + outfits);
      setItemCount(items);
      setOutfitCount(outfits);
      setIsSyncing(syncing > 0);
      setFailedCount(failed);
    });

    return unsubscribe;
  }, []);

  return {
    pendingCount,
    itemCount,
    outfitCount,
    isSyncing,
    failedCount,
    hasPending: pendingCount > 0,
  };
}
