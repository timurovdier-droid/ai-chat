import {
  MOCK_AGENT,
  MOCK_WELCOME,
  MOCK_HISTORY,
  MOCK_AI_REPLIES,
  MOCK_DEFAULT_REPLY,
} from "./mockData.js";

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function pickMockReply(userText) {
  const hit = MOCK_AI_REPLIES.find((r) => r.match.test(userText));
  return hit ? hit.text : MOCK_DEFAULT_REPLY;
}

function randomDelay() {
  const { min, max } = MOCK_AGENT.responseDelayMs;
  return min + Math.random() * (max - min);
}

/**
 * Замените на fetch/WebSocket к вашему AI-бэкенду.
 * @param {string} text
 * @param {{ messages: { role: string; text: string }[] }} context
 * @returns {Promise<string>}
 */
export async function sendToAgent(text, context) {
  await new Promise((r) => setTimeout(r, randomDelay()));
  return pickMockReply(text);
}

export function createChatWidget(rootEl) {
  if (!rootEl) return;

  let isOpen = false;
  let isTyping = false;
  /** @type {{ id: string; role: string; text: string; at: string }[]} */
  let messages = [...MOCK_HISTORY];
  let welcomeShown = false;

  const widget = document.createElement("div");
  widget.className = "jivo-widget";
  widget.innerHTML = `
    <div class="jivo-panel" id="jivo-panel" hidden>
      <header class="jivo-header">
        <div class="jivo-header__agent">
          <div class="jivo-avatar" aria-hidden="true">${MOCK_AGENT.initials}</div>
          <div class="jivo-header__meta">
            <span class="jivo-header__name">${MOCK_AGENT.name}</span>
            <span class="jivo-header__status">
              <span class="jivo-status-dot" aria-hidden="true"></span>
              ${MOCK_AGENT.isOnline ? "Онлайн" : "Не в сети"} · ${MOCK_AGENT.role}
            </span>
          </div>
        </div>
        <div class="jivo-header__actions">
          <button type="button" class="jivo-icon-btn" id="jivo-minimize" title="Свернуть" aria-label="Свернуть чат">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
          </button>
        </div>
      </header>
      <div class="jivo-messages" id="jivo-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="jivo-quick" id="jivo-quick" hidden></div>
      <div class="jivo-typing" id="jivo-typing" hidden aria-hidden="true">
        <span class="jivo-typing__label">${MOCK_AGENT.name} печатает</span>
        <span class="jivo-typing__dots"><span></span><span></span><span></span></span>
      </div>
      <footer class="jivo-footer">
        <form class="jivo-form" id="jivo-form">
          <label class="jivo-input-wrap">
            <span class="visually-hidden">Сообщение</span>
            <textarea
              id="jivo-input"
              class="jivo-input"
              rows="1"
              placeholder="Напишите сообщение…"
              maxlength="2000"
              autocomplete="off"
            ></textarea>
          </label>
          <button type="submit" class="jivo-send" id="jivo-send" aria-label="Отправить" disabled>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2z"/></svg>
          </button>
        </form>
        <p class="jivo-powered">Работает на AI · демо без бэкенда</p>
      </footer>
    </div>
    <button type="button" class="jivo-launcher" id="jivo-launcher" aria-expanded="false" aria-controls="jivo-panel">
      <span class="jivo-launcher__icon jivo-launcher__icon--chat" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
      </span>
      <span class="jivo-launcher__icon jivo-launcher__icon--close" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </span>
      <span class="jivo-launcher__badge" id="jivo-badge" hidden>1</span>
    </button>
  `;

  rootEl.appendChild(widget);

  const panel = widget.querySelector("#jivo-panel");
  const launcher = widget.querySelector("#jivo-launcher");
  const messagesEl = widget.querySelector("#jivo-messages");
  const quickEl = widget.querySelector("#jivo-quick");
  const typingEl = widget.querySelector("#jivo-typing");
  const form = widget.querySelector("#jivo-form");
  const input = widget.querySelector("#jivo-input");
  const sendBtn = widget.querySelector("#jivo-send");
  const badge = widget.querySelector("#jivo-badge");
  const minimizeBtn = widget.querySelector("#jivo-minimize");

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function renderMessage(msg) {
    if (msg.role === "system") {
      const el = document.createElement("div");
      el.className = "jivo-msg jivo-msg--system";
      el.textContent = msg.text;
      return el;
    }

    const wrap = document.createElement("div");
    wrap.className = `jivo-msg-row jivo-msg-row--${msg.role === "user" ? "user" : "agent"}`;

    if (msg.role === "agent") {
      const av = document.createElement("div");
      av.className = "jivo-avatar jivo-avatar--sm";
      av.textContent = MOCK_AGENT.initials;
      wrap.appendChild(av);
    }

    const bubble = document.createElement("div");
    bubble.className = `jivo-bubble jivo-bubble--${msg.role === "user" ? "user" : "agent"}`;
    bubble.innerHTML = `<p class="jivo-bubble__text"></p><time class="jivo-bubble__time" datetime="${msg.at}">${formatTime(msg.at)}</time>`;
    bubble.querySelector(".jivo-bubble__text").textContent = msg.text;
    wrap.appendChild(bubble);

    return wrap;
  }

  function renderAll() {
    messagesEl.innerHTML = "";
    for (const msg of messages) {
      messagesEl.appendChild(renderMessage(msg));
    }
    scrollToBottom();
  }

  function renderQuickReplies(replies) {
    if (!replies?.length) {
      quickEl.hidden = true;
      quickEl.innerHTML = "";
      return;
    }
    quickEl.hidden = false;
    quickEl.innerHTML = replies
      .map(
        (label) =>
          `<button type="button" class="jivo-chip" data-reply="${encodeURIComponent(label)}">${label}</button>`
      )
      .join("");
    quickEl.querySelectorAll(".jivo-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = decodeURIComponent(btn.getAttribute("data-reply") || "");
        input.value = text;
        updateSendState();
        form.requestSubmit();
      });
    });
  }

  function setTyping(on) {
    isTyping = on;
    typingEl.hidden = !on;
    scrollToBottom();
  }

  function updateSendState() {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText || isTyping;
  }

  function setOpen(open) {
    isOpen = open;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.classList.toggle("jivo-launcher--open", open);
    if (open) {
      badge.hidden = true;
      if (!welcomeShown) {
        welcomeShown = true;
        pushAgentMessage(MOCK_WELCOME.text);
        renderQuickReplies(MOCK_WELCOME.quickReplies);
      }
      input.focus();
    }
    scrollToBottom();
  }

  function pushUserMessage(text) {
    const msg = { id: uid(), role: "user", text, at: new Date().toISOString() };
    messages.push(msg);
    messagesEl.appendChild(renderMessage(msg));
    scrollToBottom();
    return msg;
  }

  function pushAgentMessage(text) {
    const msg = { id: uid(), role: "agent", text, at: new Date().toISOString() };
    messages.push(msg);
    messagesEl.appendChild(renderMessage(msg));
    scrollToBottom();
    return msg;
  }

  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    renderQuickReplies([]);
    pushUserMessage(trimmed);
    input.value = "";
    input.style.height = "auto";
    updateSendState();

    setTyping(true);
    try {
      const context = {
        messages: messages
          .filter((m) => m.role === "user" || m.role === "agent")
          .map((m) => ({ role: m.role, text: m.text })),
      };
      const reply = await sendToAgent(trimmed, context);
      setTyping(false);
      pushAgentMessage(reply);
    } catch {
      setTyping(false);
      pushAgentMessage("Не удалось получить ответ. Попробуйте ещё раз чуть позже.");
    }
    updateSendState();
  }

  renderAll();

  launcher.addEventListener("click", () => setOpen(!isOpen));
  minimizeBtn.addEventListener("click", () => setOpen(false));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSend(input.value);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    updateSendState();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  updateSendState();

  // Ненавязчивое приглашение, как proactive в Jivo
  window.setTimeout(() => {
    if (!isOpen) {
      badge.hidden = false;
      badge.textContent = "1";
    }
  }, 4500);

  return { open: () => setOpen(true), close: () => setOpen(false) };
}
