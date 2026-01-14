import { Client } from "@replit/object-storage";

const DEV_BUCKET_ID = "replit-objstore-3e5c444f-dadc-48cb-b2ba-8146e68c4164";
const PROD_BUCKET_ID = "replit-objstore-d4171db4-6ced-4be2-98db-a3cdb2f7a268";

function getBucketId(): string {
  // Use environment variable if set, otherwise determine by NODE_ENV
  if (process.env.OBJECT_STORAGE_BUCKET_ID) {
    return process.env.OBJECT_STORAGE_BUCKET_ID;
  }
  
  const isDevelopment = process.env.NODE_ENV === "development";
  return isDevelopment ? DEV_BUCKET_ID : PROD_BUCKET_ID;
}

let cachedClient: Client | null = null;
let cachedBucketId: string | undefined = undefined;

function getClient(): Client {
  const currentBucketId = getBucketId();
  
  // Recreate client if bucket ID changed or not initialized
  if (!cachedClient || cachedBucketId !== currentBucketId) {
    console.log(`Object Storage: NODE_ENV=${process.env.NODE_ENV}, Using bucket ID: ${currentBucketId}`);
    cachedClient = new Client({ bucketId: currentBucketId });
    cachedBucketId = currentBucketId;
  }
  return cachedClient;
}

export function isUserImage(userId: string, key: string): boolean {
  return key.startsWith(`users/${userId}/`);
}

export async function uploadImage(
  userId: string,
  imageData: string,
  fileName: string
): Promise<string> {
  const client = getClient();
  
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  
  const key = `users/${userId}/images/${fileName}`;
  
  await client.uploadFromBytes(key, buffer);
  
  return key;
}

export async function getImageUrl(key: string): Promise<string | null> {
  const client = getClient();
  
  try {
    const { ok, value } = await client.downloadAsBytes(key);
    if (!ok || !value) {
      return null;
    }
    
    const extension = key.split(".").pop()?.toLowerCase() || "jpeg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    const bytes = value as unknown as Uint8Array;
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error downloading image:", error);
    return null;
  }
}

export async function deleteImage(key: string): Promise<boolean> {
  const client = getClient();
  
  try {
    await client.delete(key);
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}
