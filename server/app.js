import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { generateAgentReply } from "./gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, messages } = req.body ?? {};

      let thread = Array.isArray(messages) ? messages : [];
      thread = thread
        .filter((m) => m && (m.role === "user" || m.role === "agent") && typeof m.text === "string")
        .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));

      const userText = typeof message === "string" ? message.trim() : "";
      if (userText) {
        const last = thread[thread.length - 1];
        if (!last || last.role !== "user" || last.text !== userText) {
          thread.push({ role: "user", text: userText });
        }
      }

      if (!thread.length || thread[thread.length - 1].role !== "user") {
        return res.status(400).json({ error: "Нужно сообщение пользователя." });
      }

      if (thread.length > 40) {
        thread = thread.slice(-40);
      }

      const reply = await generateAgentReply(thread);
      res.json({ reply });
    } catch (err) {
      console.error("[api/chat]", err.message);
      const status = err.message.includes("GEMINI_API_KEY") ? 503 : 500;
      const modelHint = /no longer available|not found/i.test(err.message)
        ? " Проверьте GEMINI_MODEL в переменных окружения (например gemini-3.5-flash-lite)."
        : "";
      res.status(status).json({
        error: status === 503
          ? "Сервер не настроен: добавьте GEMINI_API_KEY в окружение Vercel"
          : `Не удалось получить ответ от агента.${modelHint}`,
      });
    }
  });

  app.use(express.static(rootDir));
  return app;
}
