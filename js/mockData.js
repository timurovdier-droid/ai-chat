// mock — данные для демо до подключения API

export const MOCK_AGENT = {
  id: "agent-nova",
  name: "Нова",
  role: "AI-ассистент",
  avatarUrl: null,
  initials: "Н",
  isOnline: true,
};

export const SUPPORT_PHONE = "+998998887766";

export const MOCK_WELCOME = {
  text:
    "Здравствуйте! Я Нова, поддержка на нашем сайте. Отвечаю на вопросы о заказах, доставке, оплате и тарифах. По другим темам звоните: +998 99 888 77 66. Чем помочь?",
  quickReplies: [
    "Статус заказа",
    "Условия доставки",
    "Тарифы и оплата",
    "Как работает чат на сайте",
  ],
};

/** @type {{ id: string; role: 'user'|'agent'|'system'; text: string; at: string }[]} */
export const MOCK_HISTORY = [
  {
    id: "m-1",
    role: "system",
    text: "Диалог начат · сегодня, 14:32",
    at: "2026-10-10T09:32:00.000Z",
  },
];
