import OpenAI from "openai";

const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

export const openai: OpenAI | null =
  baseURL && apiKey
    ? new OpenAI({ apiKey, baseURL })
    : null;
