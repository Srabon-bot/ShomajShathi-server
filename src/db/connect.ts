import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;
let database: Db | undefined;
let connectionPromise: Promise<Db> | undefined;

export async function connectDatabase(uri: string, databaseName: string): Promise<Db> {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    database = client.db(databaseName);
    return database;
  })();

  try {
    return await connectionPromise;
  } catch (error) {
    connectionPromise = undefined;
    client = undefined;
    throw error;
  }
}

export function getDatabase(): Db {
  if (!database) throw new Error("MongoDB has not been connected.");
  return database;
}

export async function closeDatabase() {
  await client?.close();
  client = undefined;
  database = undefined;
  connectionPromise = undefined;
}
