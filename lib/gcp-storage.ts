import { Storage } from "@google-cloud/storage";

const projectId = process.env.GCP_PROJECT_ID;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
const bucketName = process.env.GCP_STORAGE_BUCKET;

let storageInstance: Storage | null = null;

function assertStorageEnv(): asserts projectId is string {
  if (!projectId) {
    throw new Error("Missing GCP_PROJECT_ID environment variable.");
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY environment variables.",
    );
  }

  if (!bucketName) {
    throw new Error("Missing GCP_STORAGE_BUCKET environment variable.");
  }
}

function getStorage(): Storage {
  assertStorageEnv();

  if (!storageInstance) {
    storageInstance = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return storageInstance;
}

export type UploadAssetInput = {
  buffer: Buffer;
  contentType: string;
  destination: string;
};

export async function uploadAsset({
  buffer,
  contentType,
  destination,
}: UploadAssetInput): Promise<string> {
  const bucket = getStorage().bucket(bucketName as string);
  const file = bucket.file(destination);

  await file.save(buffer, {
    contentType,
    resumable: false,
    public: true,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  return getAssetUrl(destination);
}

export function getAssetUrl(objectPath: string): string {
  if (!bucketName) {
    throw new Error("Missing GCP_STORAGE_BUCKET environment variable.");
  }

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
}
