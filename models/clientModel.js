import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import dotenv from "dotenv";

dotenv.config();

const TABLE_SERVICE_URL = process.env.TABLE_SERVICE_URL;
const TABLE_NAME = "clientsgustavocarrara";
const ACCOUNT_NAME = process.env.ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.ACCOUNT_KEY;

const tableCredential = new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
export const tableClient = new TableClient(TABLE_SERVICE_URL, TABLE_NAME, tableCredential);

// Função para criar a tabela se não existir
export async function ensureAzureResources() {
  try {
    await tableClient.createTable();
    console.log("Tabela de clientes verificada/criada!");
  } catch (err) {
    if (err.statusCode !== 409) console.error("Erro criando tabela de clientes:", err);
  }
}
