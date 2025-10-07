import { BlobServiceClient } from "@azure/storage-blob";
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import mime from "mime-types";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// ======= CONFIG AZURE =======
const BLOB_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME;

const TABLE_SERVICE_URL = process.env.TABLE_SERVICE_URL;
const TABLE_NAME = "vehiclesgustavocarrara";
const ACCOUNT_NAME = process.env.ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.ACCOUNT_KEY;

// ======= AZURE CLIENTS =======
export const blobServiceClient = BlobServiceClient.fromConnectionString(BLOB_CONNECTION_STRING);
export const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

const tableCredential = new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
export const tableClient = new TableClient(TABLE_SERVICE_URL, TABLE_NAME, tableCredential);

// ======= HELPERS =======
export async function ensureAzureResources() {
  await containerClient.createIfNotExists();
  await containerClient.setAccessPolicy('blob');

  try {
    await tableClient.createTable();
  } catch (err) {
    if (err.statusCode !== 409) console.error("Erro criando tabela:", err);
  }
}

export async function uploadBufferToBlob(buffer, mimetype, vehicleId) {
  const ext = mime.extension(mimetype) || "bin";
  const blobName = `${vehicleId}/${uuidv4()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });
  return { blobName, url: blockBlobClient.url };
}
