import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, useDefaults: true });
addFormats(ajv);

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = path.resolve(moduleDir, "../../world.schema.json");
const schemaPath = process.env.NARRATE_SCHEMA_PATH
  ? path.resolve(process.env.NARRATE_SCHEMA_PATH)
  : defaultSchemaPath;

const schemaRaw = fs.readFileSync(schemaPath, "utf8");
const schema = JSON.parse(schemaRaw);

export const validateWorldSchema = ajv.compile(schema);
