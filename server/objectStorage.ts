import { Client } from "@replit/object-storage";

function getBucketName(): string {
  return process.env.OBJECT_STORAGE_BUCKET || "riannahscloset-bucket-dev";
}

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client();
  }
  return client;
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
