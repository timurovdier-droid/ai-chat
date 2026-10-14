import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AGENT_SYSTEM_INSTRUCTION,
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_FALLBACKS,
} from "./agentConfig.js";
import { buildOffTopicReply, shouldRedirectToPhone } from "./siteKnowledge.js";

let genAI = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY не задан. Скопируйте .env.example в .env и укажите ключ.");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * @param {{ role: 'user' | 'agent'; text: string }[]} messages — полная история включая новое сообщение пользователя
 */
function buildChatPayload(messages) {
  const list = messages.filter((m) => m.text?.trim());

  const history = [];
  for (let i = 0; i < list.length - 1; i++) {
    const m = list[i];
    history.push({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text.trim() }],
    });
  }

  while (history.length > 0 && history[0].role === "model") {
    history.shift();
  }

  const last = list[list.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("Ожидается последнее сообщение от пользователя.");
  }

  return { history, userText: last.text.trim() };
}

function isRetryableModelError(err) {
  const msg = err?.message || "";
  return /\[404 Not Found\]|\[503 Service Unavailable\]|no longer available|high demand/i.test(msg);
}

async function generateWithModel(client, modelName, history, userText) {
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: AGENT_SYSTEM_INSTRUCTION,
  });
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userText);
  const reply = result.response.text();
  if (!reply?.trim()) {
    throw new Error("Пустой ответ от модели.");
  }
  return reply.trim();
}

export async function generateAgentReply(messages) {
  const { history, userText } = buildChatPayload(messages);

  if (shouldRedirectToPhone(userText)) {
    return buildOffTopicReply();
  }

  const client = getClient();

  const preferred = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const candidates = [...new Set([preferred, ...GEMINI_MODEL_FALLBACKS])];

  let lastError = null;
  for (const modelName of candidates) {
    try {
      return await generateWithModel(client, modelName, history, userText);
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) {
        throw err;
      }
      console.warn(`[gemini] модель ${modelName} недоступна, пробуем следующую…`);
    }
  }

  throw lastError || new Error("Не удалось получить ответ ни от одной модели Gemini.");
}
