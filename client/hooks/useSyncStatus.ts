import { useState, useEffect } from "react";
import { subscribeSyncQueue, SyncOperation, hasPendingSync, getPendingSyncCount } from "@/lib/sync-queue";

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeSyncQueue((queue: SyncOperation[]) => {
      const pending = queue.filter((op) => op.status === "pending").length;
      const syncing = queue.filter((op) => op.status === "syncing").length;
      const failed = queue.filter((op) => op.status === "failed").length;
      
      setPendingCount(pending + syncing);
      setIsSyncing(syncing > 0);
      setFailedCount(failed);
    });

    return unsubscribe;
  }, []);

  return {
    pendingCount,
    isSyncing,
    failedCount,
    hasPending: pendingCount > 0,
  };
}
