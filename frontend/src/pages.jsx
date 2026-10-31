import { useEffect, useState } from "react";

const green = "#2f7d4f";
const API = "http://127.0.0.1:8000";
const HISTORY_KEY = "agrivision_scan_history";
const LATEST_KEY = "agrivision_last_result";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Chatbot API error:", error);
    return fallback;
  }
}

function EmptyState({ title, description }) {
  return (
    <div className="observation-box" style={{ marginTop: 20 }}>
      <strong>{title}</strong>
      <p>{description}</p>
      <a href="#scanner" style={{ color: green, fontWeight: 700 }}>
        Open AI Farm Scanner →
      </a>
    </div>
  );
}

function useDatabaseScans() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadScans() {
      try {
        const response = await fetch(`${API}/scans`);
        if (!response.ok) throw new Error("Unable to load scans.");

        const data = await response.json();

        const records = (data.scans || []).map((scan) => {
          const analysis = scan.disease_analysis || {};
          const prediction = analysis.predictions?.[0];

          return {
            id: scan.id,
            crop: scan.crop || "Unknown crop",
            disease: prediction
              ? prediction.label.replaceAll("___", " — ").replaceAll("_", " ")
              : analysis.status === "unsupported_crop"
                ? "Disease analysis not supported"
                : "No supported prediction",
            confidence: prediction?.confidence ?? null,
            date: scan.created_at,
            recommendation: analysis.message || "",
            location: scan.location || "",
          };
        });

        if (active) {
          setHistory(records);
          setError("");
        }
      } catch {
        if (active) {
          setError(
            "Cannot connect to the backend. Please check that FastAPI is running."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadScans();

    return () => {
      active = false;
    };
  }, []);

  return { history, loading, error };
}

function Advisory() {
  const [advisory, setAdvisory] = useState(null);

  const confidence = Number(advisory?.confidence);

  const lowConfidence =
    !Number.isFinite(confidence) || confidence < 90;

  useEffect(() => {
    setAdvisory(readStorage(LATEST_KEY, null));
  }, []);

  return (
    <div className="scanner-page">
      <p className="eyebrow">AI AGRICULTURAL SUPPORT</p>

      <h1>AI Farm Advisory</h1>

      <p className="scanner-subtitle">
        Recommendations based on your latest crop image analysis.
      </p>

      {!advisory ? (
        <div className="result-card" style={{ marginTop: 30 }}>
          <EmptyState
            title="No recent analysis found"
            description="Upload a crop image in the scanner first. Your latest result will appear here."
          />
        </div>
      ) : (
        <div className="result-card" style={{ marginTop: 30 }}>
          <h2>🌿 AI Advisory</h2>

          <div className="observation-box" style={{ marginTop: 20 }}>
            <span>AI prediction</span>

            <h3>
              {advisory.disease || "No supported prediction"}
            </h3>

            <p>
              Selected crop:{" "}
              <strong>
                {advisory.crop || "Not recorded"}
              </strong>
            </p>
          </div>

          <div className="result-details">
            <div className="detail-box">
              <span>Crop</span>

              <strong>
                {advisory.crop || "Unknown"}
              </strong>
            </div>

            <div className="detail-box">
              <span>Model confidence</span>

              <strong>
                {Number.isFinite(Number(advisory.confidence))
                  ? `${advisory.confidence}%`
                  : "Unavailable"}
              </strong>
            </div>

            <div className="detail-box">
              <span>Analysis model</span>

              <strong>
                PlantVillage ViT
              </strong>
            </div>
          </div>

          {lowConfidence && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                background: "#fff1f0",
                border: "1px solid #e8a09a",
                color: "#842029",
              }}
            >
              <strong>
                ⚠️ Low confidence — verify this result
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  marginTop: 8,
                }}
              >
                This prediction may be unreliable. Do not treat it
                as a confirmed disease diagnosis or choose pesticides
                based on this result alone. Inspect the crop and
                consult a qualified agricultural expert.
              </p>
            </div>
          )}

          <div
            className="observation-box"
            style={{ marginTop: 20 }}
          >
            <span>🌱 Recommended action</span>

            <p>
              {advisory.recommendation ||
                "Inspect the crop carefully and seek local agricultural guidance."}
            </p>
          </div>

          <div
            className="observation-box"
            style={{ marginTop: 15 }}
          >
            <span>💧 General farm care</span>

            <p>
              Check soil moisture, inspect both sides of affected
              leaves, monitor nearby plants, and avoid unnecessary
              pesticide use. Adapt advice to the crop and local
              conditions.
            </p>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 15,
              borderRadius: 12,
              background: "#fff8e8",
              border: "1px solid #f0dfb0",
            }}
          >
            <strong>⚠️ Important</strong>

            <p style={{ marginBottom: 0 }}>
              AI predictions are not confirmed diagnoses. Verify
              important treatment decisions with a qualified
              agricultural expert.
            </p>
          </div>

          <a
            href="#scanner"
            style={{
              display: "inline-block",
              marginTop: 20,
              background: green,
              color: "white",
              padding: "13px 22px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Analyze Another Image →
          </a>
        </div>
      )}
    </div>
  );
}

function Chatbot() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "AgriVision AI",
      text:
        "Hello! 🌱 Ask me about this project, YOLO, crop disease classification, RAG, GenAI, or general farm care. Built-in guidance is available in this version.",
    },
  ]);

  async function sendMessage() {
    const question = message.trim();
    if (!question || busy) return;

    setMessages((old) => [...old, { sender: "You", text: question }]);
    setMessage("");
    setBusy(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok) throw new Error("Chat endpoint unavailable");

      const data = await response.json();
      const answer = data.reply;

      if (!answer) throw new Error("No answer returned");

      setMessages((old) => [
        ...old,
        { sender: "AgriVision AI", text: answer },
      ]);
    } catch {
      setMessages((old) => [
        ...old,
        { sender: "AgriVision AI", text: getLocalAnswer(question) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scanner-page">
      <p className="eyebrow">AGRICULTURAL SUPPORT</p>

      <h1>Agricultural AI Chatbot</h1>

      <p className="scanner-subtitle">
        Ask about the project or general crop management.
      </p>

      <div
        className="result-card"
        style={{ marginTop: 30, maxWidth: 900 }}
      >
        <div
          aria-live="polite"
          style={{
            minHeight: 300,
            maxHeight: 480,
            overflowY: "auto",
            padding: 10,
          }}
        >
          {messages.map((item, index) => (
            <div
              key={index}
              style={{
                padding: 14,
                marginBottom: 12,
                borderRadius: 12,
                background:
                  item.sender === "You"
                    ? "#f5f5f5"
                    : "#f0f7f2",
              }}
            >
              <strong>{item.sender}</strong>

              <p
                style={{
                  marginBottom: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {item.text}
              </p>
            </div>
          ))}

          {busy && <p>Thinking…</p>}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
          style={{
            display: "flex",
            gap: 10,
            marginTop: 8,
          }}
        >
          <input
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            aria-label="Ask a question"
            placeholder="Ask a question..."
            style={{
              flex: 1,
              minWidth: 0,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #d5e2d9",
            }}
          />

          <button
            type="submit"
            disabled={busy || !message.trim()}
            style={{
              background: green,
              color: "white",
              border: 0,
              borderRadius: 10,
              padding: "0 22px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </form>

        <p
          style={{
            fontSize: 12,
            color: "#65736b",
            marginTop: 12,
          }}
        >
          If the backend chat endpoint is unavailable, this chatbot
          uses built-in guidance instead of live language-model answers.
        </p>
      </div>
    </div>
  );
}

function getLocalAnswer(question) {
  const q = question.toLowerCase();

  if (q.includes("rag") || q.includes("retrieval augmented")) {
    return "RAG means Retrieval-Augmented Generation. It retrieves relevant passages from trusted documents and supplies them to a language model. A complete RAG pipeline is not yet confirmed as implemented.";
  }

  if (
    q.includes("genai") ||
    q.includes("generative ai") ||
    q.includes("llm")
  ) {
    return "Generative AI uses a language model to generate natural-language answers. Live answers require a working model integration and securely configured provider credentials.";
  }

  if (q.includes("yolo")) {
    return "YOLO is an object-detection model. The general YOLO model is not a specialized crop-disease detector. Disease classification is handled separately by the image classifier.";
  }

  if (
    q.includes("flow") ||
    q.includes("workflow") ||
    q.includes("architecture")
  ) {
    return "The workflow is: React image upload → FastAPI backend → YOLO object detection → PlantVillage-trained disease classifier for supported crops → results and general advisory.";
  }

  if (q.includes("iot") || q.includes("sensor")) {
    return "AgriVision AI is software-based and does not use IoT sensors. It analyzes user-uploaded images rather than automatically measuring soil moisture, temperature, or humidity.";
  }

  if (
    q.includes("disease") ||
    q.includes("prediction") ||
    q.includes("confidence")
  ) {
    return "The classifier supports only classes represented in its training data. Predictions may be wrong, and confidence is not proof of a disease. Verify important findings with an agricultural expert.";
  }

  if (
    q.includes("irrigation") ||
    q.includes("water")
  ) {
    return "Check soil moisture and the crop's growth stage before watering. Avoid both waterlogging and prolonged dryness. Suitable irrigation depends on soil, weather, and crop type.";
  }

  if (
    q.includes("hello") ||
    q === "hi" ||
    q.includes("hey")
  ) {
    return "Hello! 🌱 Ask me about AgriVision AI, YOLO, disease classification, RAG, GenAI, or general farm care.";
  }

  return "I couldn't confidently answer that with my built-in guidance. Try asking about the project workflow, YOLO, disease classification, RAG, GenAI, irrigation, or general farm care.";
}

function Monitoring() {
  const { history, loading, error } = useDatabaseScans();

  const alerts = history.filter(
    (item) =>
      item.confidence !== null &&
      item.disease !== "No supported prediction" &&
      item.disease !== "Disease analysis not supported"
  ).length;

  return (
    <div className="scanner-page">
      <p className="eyebrow">FARM HISTORY</p>

      <h1>Monitoring & History</h1>

      <p className="scanner-subtitle">
        Saved scan records from the AgriVision AI database.
      </p>

      <div
        className="result-details"
        style={{ marginTop: 30 }}
      >
        <div className="detail-box">
          <span>Total recorded scans</span>
          <strong>
            {loading ? "…" : history.length}
          </strong>
        </div>

        <div className="detail-box">
          <span>Predictions to review</span>
          <strong>
            {loading ? "…" : alerts}
          </strong>
        </div>

        <div className="detail-box">
          <span>Storage</span>
          <strong>SQLite database</strong>
        </div>
      </div>

      <div
        className="result-card"
        style={{ marginTop: 25 }}
      >
        <h2>Recorded activity</h2>

        {loading ? (
          <p>Loading saved scans…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : history.length === 0 ? (
          <EmptyState
            title="No saved scans yet"
            description="Analyze a crop image to add a record to your database."
          />
        ) : (
          history.map((item) => (
            <div
              className="detection-row"
              key={item.id}
            >
              <div>
                <strong>{item.crop}</strong>

                <p style={{ margin: "5px 0" }}>
                  {item.disease}
                </p>

                {item.location && (
                  <p>Location: {item.location}</p>
                )}

                <small>
                  {item.date
                    ? new Date(item.date).toLocaleString()
                    : "Date unavailable"}
                </small>
              </div>

              <strong>
                {item.confidence !== null
                  ? `${item.confidence}%`
                  : "—"}
              </strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Reports() {
  const { history, loading, error } = useDatabaseScans();

  const flagged = history.filter(
    (item) =>
      item.confidence !== null &&
      item.disease !== "No supported prediction" &&
      item.disease !== "Disease analysis not supported"
  ).length;

  function printReport() {
    if (history.length === 0) {
      window.alert(
        "No saved scans yet. Analyze a crop image first."
      );
      return;
    }

    window.print();
  }

  return (
    <div className="scanner-page">
      <p className="eyebrow">FARM INTELLIGENCE</p>

      <h1>AI Farm Reports</h1>

      <p className="scanner-subtitle">
        Summary generated from scans saved in the database.
      </p>

      <div
        className="result-details"
        style={{ marginTop: 30 }}
      >
        <div className="detail-box">
          <span>Recorded scans</span>
          <strong>
            {loading ? "…" : history.length}
          </strong>
        </div>

        <div className="detail-box">
          <span>Predictions to review</span>
          <strong>
            {loading ? "…" : flagged}
          </strong>
        </div>
      </div>

      <div
        className="result-card"
        style={{ marginTop: 25 }}
      >
        <h2>Scan summary</h2>

        {loading ? (
          <p>Loading report data…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : history.length === 0 ? (
          <EmptyState
            title="Nothing to report yet"
            description="Analyze a crop image first to create a report."
          />
        ) : (
          <>
            {history.map((item) => (
              <div
                className="detection-row"
                key={item.id}
              >
                <div>
                  <strong>{item.crop}</strong>

                  <p style={{ margin: "5px 0" }}>
                    {item.disease}
                  </p>

                  <small>
                    {item.date
                      ? new Date(item.date).toLocaleString()
                      : "Date unavailable"}
                  </small>

                  {item.recommendation && (
                    <p>{item.recommendation}</p>
                  )}
                </div>

                <strong>
                  {item.confidence !== null
                    ? `${item.confidence}%`
                    : "—"}
                </strong>
              </div>
            ))}

            <button
              onClick={printReport}
              style={{
                marginTop: 20,
                background: green,
                color: "white",
                border: 0,
                padding: "14px 22px",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Print / Save as PDF
            </button>
          </>
        )}

        <p
          style={{
            fontSize: 12,
            color: "#65736b",
            marginTop: 15,
          }}
        >
          Choose “Save as PDF” in the browser print dialog. The
          report contains recorded scans, not a verified measure
          of overall farm health.
        </p>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="scanner-page">
      <p className="eyebrow">AGRIVISION AI</p>

      <h1>About the Project</h1>

      <div
        className="result-card"
        style={{ marginTop: 30, maxWidth: 950 }}
      >
        <h2>AI-Based Farm Monitoring & Advisory System</h2>

        <p>
          AgriVision AI is a software-based academic project designed
          to demonstrate crop-image analysis and agricultural decision
          support.
        </p>

        <div className="observation-box">
          <span>Technology</span>

          <p>
            React, Vite, Python, FastAPI, Ultralytics YOLO, and a
            PlantVillage-trained image classifier.
          </p>
        </div>

        <div className="observation-box">
          <span>Workflow</span>

          <p>
            Crop image → object detection → disease classification
            → results → general advisory.
          </p>
        </div>

        <div className="observation-box">
          <span>Scope</span>

          <p>
            Software-only image analysis. No IoT sensors are used.
            Actual capabilities depend on the models and backend
            features installed.
          </p>
        </div>

        <div className="observation-box">
          <span>Limitations</span>

          <p>
            AI predictions may be inaccurate. A live language-model
            chatbot, complete RAG pipeline, and secure authentication
            should only be claimed if separately implemented and tested.
          </p>
        </div>
      </div>
    </div>
  );
}

export {
  Advisory,
  Chatbot,
  Monitoring,
  Reports,
  About,
};