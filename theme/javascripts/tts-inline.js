(function () {
  let currentBtn = null;

  function isTtsSupported() {
    return ("speechSynthesis" in window) && ("SpeechSynthesisUtterance" in window);
  }

  function pickVoiceByLang(lang) {
    const voices = window.speechSynthesis.getVoices() || [];
    // 優先挑同語系（例如 en-US、en-GB）
    const byLang = voices.find(v => (v.lang || "").toLowerCase() === (lang || "").toLowerCase());
    if (byLang) return byLang;

    const base = (lang || "").split(/[-_]/)[0]?.toLowerCase();
    if (base) {
      const byBase = voices.find(v => (v.lang || "").toLowerCase().startsWith(base));
      if (byBase) return byBase;
    }

    // 最後再用 name 猜
    if (base === "en") {
      return voices.find(v => /english/i.test(v.name)) || null;
    }
    return null;
  }

  function stopSpeaking() {
    try { window.speechSynthesis.cancel(); } catch (_) {}
    if (currentBtn) {
      currentBtn.textContent = "▶";
      currentBtn.setAttribute("aria-pressed", "false");
      currentBtn = null;
    }
  }

  function speakText(text, lang, btn) {
    if (!isTtsSupported()) {
      return;
    }

    const cleaned = (text || "").trim();
    if (!cleaned) return;

    // 同一顆再按一次：停止
    if (currentBtn === btn) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = lang || "en-US";

    const v = pickVoiceByLang(u.lang);
    if (v) u.voice = v;

    btn.textContent = "■";
    btn.setAttribute("aria-pressed", "true");
    currentBtn = btn;

    u.onend = () => stopSpeaking();
    u.onerror = () => stopSpeaking();

    // 某些瀏覽器需要先觸發一次 getVoices
    window.speechSynthesis.getVoices();
    window.speechSynthesis.speak(u);
  }

  function enhanceTtsSpans() {
    // 找所有 <span class="tts">...</span>
    const nodes = document.querySelectorAll("span.tts");
    nodes.forEach((span) => {
      // 避免重複加按鈕
      if (span.querySelector(":scope > button.tts-btn")) return;

      const btn = document.createElement("button");
      btn.className = "tts-btn";
      btn.type = "button";
      btn.textContent = "▶";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Speak");

      // 朗讀內容：
      // 1) data-tts 指定內容（可含 A)）
      // 2) 否則用 span 的純文字
      const lang = span.getAttribute("data-lang") || "en-US";
      const rawText = span.getAttribute("data-tts") || span.textContent;

      btn.addEventListener("click", () => speakText(rawText, lang, btn));
      span.appendChild(btn);
    });

    // 若不支援 TTS，把按鈕禁用
    if (!isTtsSupported()) {
      document.querySelectorAll("button.tts-btn").forEach((b) => {
        b.disabled = true;
        b.style.opacity = "0.6";
        b.style.cursor = "not-allowed";
        b.textContent = "×";
        b.setAttribute("aria-label", "TTS not supported");
      });
    }
  }

  function init() {
    enhanceTtsSpans();
  }

  // mkdocs-material 若開 instant navigation，用 document$.subscribe
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

  // voices 可能延遲載入，保險起見
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }
})();
