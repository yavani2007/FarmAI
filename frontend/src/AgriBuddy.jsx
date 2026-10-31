import { useEffect, useRef, useState } from "react";
import "./AgriBuddy.css";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function renderAssistantReply(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [];
  let currentSection = null;

  lines.forEach((line) => {
    const match = line.match(/^(\d+)\.\s*(.*)$/);

    if (match) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        number: match[1],
        title: match[2],
        text: "",
      };
    } else if (currentSection) {
      currentSection.text +=
        (currentSection.text ? " " : "") + line;
    } else {
      sections.push({
        intro: line,
      });
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections.map((section, index) => {
    if (section.intro) {
      return (
        <p
          key={`intro-${index}`}
          className="agribuddy-intro"
        >
          {section.intro}
        </p>
      );
    }

    let title = section.title;
    let explanation = section.text;

    const colonIndex = title.indexOf(":");

    if (colonIndex !== -1) {
      explanation =
        title.substring(colonIndex + 1).trim() +
        (explanation ? ` ${explanation}` : "");

      title = title.substring(0, colonIndex).trim();
    }

    return (
      <div
        key={`point-${index}`}
        className="agribuddy-point"
      >
        <div className="agribuddy-point-header">
          <span className="agribuddy-point-number">
            {section.number}
          </span>

          <span className="agribuddy-point-title">
            {title}
          </span>
        </div>

        {explanation && (
          <p className="agribuddy-point-text">
            {explanation}
          </p>
        )}
      </div>
    );
  });
}

function AgriBuddy() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("te-IN");
  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      setQuestion(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  function startListening() {
    if (!recognitionRef.current) {
      alert(
        "Voice input is not supported in this browser. Please use Chrome."
      );
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  async function speak(text, messageLanguage = language) {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }

        audioRef.current = null;
      }

      const formData = new FormData();

      formData.append("text", text);
      formData.append("language", messageLanguage);

      const response = await fetch(
        "http://127.0.0.1:8000/agribuddy/tts",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.detail || "Could not generate voice."
        );
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      alert(
        error.message || "Could not play voice."
      );
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = question.trim();

    if (!text || isSending) return;

    setQuestion("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: text,
        language: language,
      },
    ]);

    setIsSending(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/agribuddy/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            language: language,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "AgriBuddy could not respond."
        );
      }

      const cleanReply = (
        data.reply ||
        "Sorry, I could not generate a reply."
      )
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: cleanReply,
          language: language,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            error.message ||
            "Could not connect to AgriBuddy. Please try again.",
          language: language,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="agribuddy-widget">
      {isOpen && (
        <section className="agribuddy-panel">
          <header className="agribuddy-header">
            <div>
              <strong>AgriBuddy AI</strong>
              <p>Your farming companion</p>
            </div>

            <button
              type="button"
              className="agribuddy-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>

          <label className="agribuddy-language">
            Voice language

            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value)
              }
            >
              <option value="te-IN">Telugu</option>
              <option value="en-IN">English</option>
            </select>
          </label>

          <div
            className="agribuddy-messages"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`agribuddy-message ${message.role}`}
              >
                {message.role === "assistant" ? (
                  renderAssistantReply(message.text)
                ) : (
                  <p>{message.text}</p>
                )}

                {message.role === "assistant" && (
                  <button
                    type="button"
                    className="agribuddy-speak"
                    onClick={() =>
                      speak(
                        message.text,
                        message.language || language
                      )
                    }
                  >
                    🔊 Listen
                  </button>
                )}
              </div>
            ))}

            {isSending && (
              <div className="agribuddy-message assistant">
                <p>Thinking...</p>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`agribuddy-mic ${
              isListening ? "listening" : ""
            }`}
            onClick={startListening}
          >
            {isListening
              ? "Listening..."
              : "🎙 Speak your question"}
          </button>

          <form
            className="agribuddy-form"
            onSubmit={sendMessage}
          >
            <input
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Type your question..."
              aria-label="Your question"
            />

            <button
              type="submit"
              disabled={isSending}
            >
              {isSending ? "Thinking..." : "Send"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="agribuddy-launcher"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Open AgriBuddy AI"
      >
        🌱
      </button>
    </div>
  );
}

export default AgriBuddy;