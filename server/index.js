import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`AI chat: http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Предупреждение: GEMINI_API_KEY не задан — чат вернёт ошибку 503.");
  }
});
