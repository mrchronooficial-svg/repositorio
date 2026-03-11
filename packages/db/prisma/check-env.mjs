import dotenv from "dotenv";
dotenv.config({ path: "../../apps/web/.env" });

console.log("DB URL exists:", Boolean(process.env.DATABASE_URL));
if (process.env.DATABASE_URL) {
  console.log("DB URL prefix:", process.env.DATABASE_URL.substring(0, 40) + "...");
}
