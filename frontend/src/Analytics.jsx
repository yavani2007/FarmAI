
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./Analytics.css";

const API_URL = "http://127.0.0.1:8000";
const COLORS = ["#25845b", "#e45b5b", "#ed9b39"];

function Analytics() {
  const [days, setDays] = useState(7);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/analytics?days=${days}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("API unavailable");

        setAnalytics(await response.json());
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("Analytics data could not be loaded. Please check the backend.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAnalytics();
    return () => controller.abort();
  }, [days]);

  const health = analytics?.crop_health || {};
  const healthy = Number(health.healthy || 0);
  const disease = Number(health.disease || 0);
  const pest = Number(health.pest || 0);

  const daily = (analytics?.daily_scans || []).map((item) => ({
    ...item,
    scans: Number(item.scans || 0),
  }));
const totalHealthCount = healthy + disease + pest;
const diseasePercentage =
  totalHealthCount > 0
    ? Math.round((disease / totalHealthCount) * 100)
    : 0;
const healthyPercentage =
  totalHealthCount > 0
    ? Math.round((healthy / totalHealthCount) * 100)
    : 0;
  const pieData = [
    { name: "Healthy", value: healthy },
    { name: "Disease", value: disease },
    { name: "Pest", value: pest },
  ].filter((item) => item.value > 0);

  return (
    <main className="main analytics-page">
      <header className="analytics-title-bar">
        <div>
          <p className="analytics-eyebrow">FARM INTELLIGENCE</p>
          <h1>Farm Analytics</h1>
          <p className="analytics-subtitle">
            Understand crop health and monitor your farm activity.
          </p>
        </div>

        <label className="analytics-filter">
          Time period
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={15}>Last 15 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>
      </header>

      {loading && <p>Loading analytics...</p>}
      {!loading && error && <p className="analytics-error">{error}</p>}

      {!loading && !error && analytics && (
        <>
          <section className="analytics-stats">
            <article className="analytics-stat">
              <p>Total scans</p>
              <h2>{Number(analytics.total_scans || 0)}</h2>
            </article>
            <article className="analytics-stat">
              <p>Healthy results</p>
              <h2>{healthy}</h2>
            </article>
            <article className="analytics-stat">
              <p>Disease detections</p>
              <h2>{disease}</h2>
            </article>
            <article className="analytics-stat">
              <p>Pest detections</p>
              <h2>{pest}</h2>
            </article>
          </section>

          <section className="analytics-charts vertical-charts">
            <article className="analytics-card">
              <h3>Daily scan activity</h3>
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="scans"
                      name="Scans"
                      stroke="#25845b"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No scan records available for this period.</p>
              )}
            </article>

            <article className="analytics-card">
              <h3>Crop health distribution</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={85}
                      label
                    >
                      {pieData.map((item) => (
                        <Cell key={item.name} fill={
                          COLORS[
                            ["Healthy", "Disease", "Pest"].indexOf(item.name)
                          ]
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No crop health records available.</p>
              )}
              <div className="crop-health-summary">
  <div className="crop-health-total">
    <span>Analyzed Results</span>
    <strong>{totalHealthCount}</strong>
    <small>Recorded classifications</small>
  </div>

  <div className="crop-health-metric">
    <span className="health-dot healthy-dot"></span>
    <div>
      <strong>{healthyPercentage}%</strong>
      <p>Healthy crops</p>
      <small>{healthy} results</small>
    </div>
  </div>

  <div className="crop-health-metric">
    <span className="health-dot disease-dot"></span>
    <div>
      <strong>{diseasePercentage}%</strong>
      <p>Disease detections</p>
      <small>{disease} results</small>
    </div>
  </div>

  <div className="crop-health-metric">
    <span className="health-dot pest-dot"></span>
    <div>
      <strong>{pest}</strong>
      <p>Pest detections</p>
      <small>Recorded results</small>
    </div>
  </div>
</div>
            </article>
          </section>
        </>
      )}

      <footer className="dashboard-footer">
        <a href="#dashboard">← Back to Dashboard</a>
        <span>AgriVision AI · Farm Analytics</span>
      </footer>
    </main>
  );
}

export default Analytics;