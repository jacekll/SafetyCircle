import { config } from "dotenv";
import path from "path";
let envFile = '.env.development';

if (process.env.NODE_ENV === "production") {
    envFile = ".env";
}

config({ path: path.resolve(process.cwd(), envFile), override: true });

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
