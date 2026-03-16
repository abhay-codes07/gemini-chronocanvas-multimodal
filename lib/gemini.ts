import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const client = new GoogleGenerativeAI(geminiApiKey);

export const geminiModelName = "gemini-1.5-pro-latest";

export const geminiModel: GenerativeModel = client.getGenerativeModel({
  model: geminiModelName,
});
