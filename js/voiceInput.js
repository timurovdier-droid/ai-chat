export function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isVoiceInputSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * Голосовой ввод через Web Speech API (Chrome / Edge).
 * @param {{
 *   lang?: string;
 *   onStart?: () => void;
 *   onInterim?: (text: string) => void;
 *   onFinal?: (text: string) => void;
 *   onEnd?: () => void;
 *   onError?: (message: string) => void;
 * }} handlers
 */
export function createVoiceInput(handlers = {}) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      supported: false,
      listening: () => false,
      start() {
        handlers.onError?.("Голосовой ввод не поддерживается в этом браузере. Откройте чат в Chrome или Edge.");
      },
      stop() {},
    };
  }

  let recognition = null;
  let listening = false;
  let stopping = false;
  let finalBuffer = "";

  function cleanup() {
    listening = false;
    stopping = false;
    handlers.onEnd?.();
  }

  /** @param {{ send?: boolean }} [opts] send=false — остановить без автоотправки */
  function stop(opts = {}) {
    if (!recognition || !listening) return;
    stopping = opts.send === false;
    try {
      recognition.stop();
    } catch {
      cleanup();
    }
  }

  function start() {
    if (listening) return;

    recognition = new Ctor();
    recognition.lang = handlers.lang || "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    finalBuffer = "";
    listening = true;
    stopping = false;
    handlers.onStart?.();

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalBuffer = `${finalBuffer} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      const draft = `${finalBuffer} ${interim}`.trim();
      if (draft) handlers.onInterim?.(draft);
    };

    recognition.onerror = (event) => {
      const code = event.error;
      const messages = {
        "not-allowed": "Нет доступа к микрофону. Разрешите его в браузере и повторите.",
        "service-not-allowed": "Распознавание речи недоступно. Проверьте разрешения сайта.",
        "no-speech": "Речь не распознана. Нажмите микрофон и повторите.",
        aborted: "",
        "audio-capture": "Микрофон не найден. Подключите устройство ввода.",
        network: "Нет сети для распознавания речи. Проверьте интернет.",
      };
      const message = messages[code];
      if (message) handlers.onError?.(message);
    };

    recognition.onend = () => {
      const text = finalBuffer.trim();
      listening = false;
      const shouldSend = !stopping && text;
      cleanup();
      if (shouldSend) handlers.onFinal?.(text);
    };

    try {
      recognition.start();
    } catch {
      cleanup();
      handlers.onError?.("Не удалось запустить микрофон. Попробуйте ещё раз.");
    }
  }

  return {
    supported: true,
    listening: () => listening,
    start,
    stop,
    toggle() {
      if (listening) stop();
      else start();
    },
  };
}
