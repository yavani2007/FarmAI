import { useEffect, useState } from "react";
import Analytics from "./Analytics";
import "./App.css";

const farmNotifications = [
  { id: 1, title: "Possible leaf disease", detail: "Review the tomato scan and follow the advisory carefully.", time: "Today", tone: "red", href: "#advisory" },
  { id: 2, title: "Pest observation", detail: "Inspect the affected crop area and confirm symptoms.", time: "Today", tone: "orange", href: "#monitoring" },
  { id: 3, title: "Healthy crop result", detail: "The latest rice crop scan was marked healthy.", time: "Yesterday", tone: "green", href: "#monitoring" },
];

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function Dashboard() {
  const [now, setNow] = useState(() => new Date());
  const [user, setUser] = useState({ name: "Farm Manager", email: "" });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const timer = window.setInterval(updateTime, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedUser = JSON.parse(sessionStorage.getItem("agrivisionUser") || "null");
      if (savedUser) {
        setUser({
          name: savedUser.name || savedUser.full_name || savedUser.email?.split("@")[0] || "Farm Manager",
          email: savedUser.email || "",
        });
      }
    } catch (error) {
      console.warn("Could not read saved AgriVision user profile.", error);
    }
  }, []);

  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Farm Manager";
  const initial = displayName.charAt(0).toUpperCase();
  const unreadCount = farmNotifications.filter((item) => !readNotifications.includes(item.id)).length;

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setNotificationsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [notificationsOpen]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🌱</div>
          <div>
            <h2>AgriVision</h2>
            <span>AI FARM INTELLIGENCE</span>
          </div>
        </div>

        <nav>
          <div className="nav-title">MAIN MENU</div>
          <a className="nav-item active" href="#dashboard"><span>▦</span>Dashboard</a>
          <a className="nav-item" href="#scanner"><span>⌕</span>AI Farm Scanner</a>
          <a className="nav-item" href="#advisory"><span>✦</span>AI Advisory</a>
          <a className="nav-item" href="#chatbot"><span>💬</span>AI Chatbot</a>
          <a className="nav-item" href="#monitoring"><span>◷</span>Monitoring History</a>
          <a className="nav-item" href="#reports"><span>▤</span>Farm Reports</a>
          <div className="nav-title second">SYSTEM</div>
          <a className="nav-item" href="#settings"><span>⚙</span>Settings</a>
          <a className="nav-item" href="#about"><span>ⓘ</span>About Project</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="ai-status">
            <div className="status-dot" />
            <div><strong>AI System Online</strong><small>Monitoring system active</small></div>
          </div>
        </div>
      </aside>

      <main className="main dashboard-main">
        <header className="topbar dashboard-topbar">
          <div>
            <p className="welcome">{getGreeting(now)} 👋</p>
            <h1>Welcome to AgriVision, {displayName.split(/[\s._-]/)[0]}!</h1>
            <p className="subtitle">Monitor your farm health and make better decisions.</p>
          </div>
          <div className="profile dashboard-profile">
            <div className="notification-wrap">
              <button
                className="notification dashboard-notification"
                type="button"
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div className="notification-popover" role="dialog" aria-label="Farm notifications">
                  <div className="notification-popover-head">
                    <div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread updates` : "You're all caught up"}</small></div>
                    {unreadCount > 0 && <button type="button" onClick={() => setReadNotifications(farmNotifications.map((item) => item.id))}>Mark all read</button>}
                  </div>
                  {farmNotifications.map((item) => (
                    <a
                      className={`notification-item ${item.tone} ${readNotifications.includes(item.id) ? "is-read" : ""}`}
                      href={item.href}
                      key={item.id}
                      onClick={() => { setReadNotifications((current) => current.includes(item.id) ? current : [...current, item.id]); setNotificationsOpen(false); }}
                    >
                      <span className="notification-item-dot" />
                      <span className="notification-item-copy"><strong>{item.title}</strong><small>{item.detail}</small><em>{item.time}</em></span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="avatar" title={displayName}>{initial}</div>
            <div className="profile-copy"><strong>{displayName}</strong><small>Your Farm, Your Future 🌱</small></div>
          </div>
        </header>

        <section className="health-banner dashboard-health">
          <div className="health-left">
            <div className="health-icon">🌿</div>
            <div>
              <p>OVERALL FARM HEALTH</p>
              <h2>Good Condition</h2>
              <span>Your latest farm overview at a glance</span>
            </div>
          </div>
          <div className="health-score"><strong>86%</strong><span>Health score</span></div>
        </section>

        <div className="dashboard-section-heading">
          <div><h2>Farm at a glance</h2><p>Your current monitoring summary</p></div>
          <span className="live-pill"><i /> Overview</span>
        </div>

        <section className="stats-grid dashboard-stats">
          <article className="stat-card dashboard-stat">
            <div className="stat-top"><div className="stat-icon blue">◎</div><span className="stat-kicker">ALL TIME</span></div>
            <p>Total Scans</p><h2>128</h2><small className="stat-note">Crop images analyzed</small>
          </article>
          <article className="stat-card dashboard-stat">
            <div className="stat-top"><div className="stat-icon red">✚</div><span className="stat-kicker">ATTENTION</span></div>
            <p>Diseases Detected</p><h2>14</h2><small className="stat-note">Review recommendations</small>
          </article>
          <article className="stat-card dashboard-stat">
            <div className="stat-top"><div className="stat-icon orange">⚠</div><span className="stat-kicker">OBSERVE</span></div>
            <p>Pests Detected</p><h2>08</h2><small className="stat-note">Check affected crops</small>
          </article>
          <article className="stat-card dashboard-stat">
            <div className="stat-top"><div className="stat-icon green">✓</div><span className="stat-kicker">GOOD HEALTH</span></div>
            <p>Healthy Crops</p><h2>106</h2><small className="stat-note">82.8% of scans</small>
          </article>
        </section>

        <section className="dashboard-content-grid">
          <div className="panel dashboard-panel">
            <div className="panel-header dashboard-panel-header">
              <div><h2>Recent AI Analysis</h2><p>Latest crop monitoring results</p></div>
              <a className="view-btn" href="#monitoring">View history ↗</a>
            </div>
            <div className="analysis-list dashboard-analysis-list">
              <div className="analysis-row dashboard-analysis-row">
                <div className="crop-image tomato">🍅</div>
                <div className="analysis-info"><strong>Tomato Leaf Analysis</strong><span>Today · 06:42 PM</span></div>
                <div className="result disease"><strong>Leaf disease</strong><span>92% confidence</span></div>
              </div>
              <div className="analysis-row dashboard-analysis-row">
                <div className="crop-image rice">🌾</div>
                <div className="analysis-info"><strong>Rice Field Analysis</strong><span>Today · 04:15 PM</span></div>
                <div className="result healthy"><strong>Healthy crop</strong><span>97% confidence</span></div>
              </div>
              <div className="analysis-row dashboard-analysis-row">
                <div className="crop-image chilli">🌶️</div>
                <div className="analysis-info"><strong>Chilli Crop Analysis</strong><span>Yesterday · 11:30 AM</span></div>
                <div className="result pest"><strong>Pest alert</strong><span>89% confidence</span></div>
              </div>
            </div>
          </div>

          <div className="panel dashboard-panel quick-panel">
            <div className="panel-header dashboard-panel-header">
              <div><h2>Quick Actions</h2><p>Choose your next farm activity</p></div>
            </div>
            <a className="action-card dashboard-action" href="#scanner">
              <div className="action-icon purple">📷</div>
              <div><strong>Analyze crop image</strong><small>Detect possible diseases and pests</small></div>
              <b>→</b>
            </a>
            <a className="action-card dashboard-action" href="#advisory">
              <div className="action-icon orange">✦</div>
              <div><strong>Get AI advisory</strong><small>Explore practical crop guidance</small></div>
              <b>→</b>
            </a>
            <a className="action-card dashboard-action" href="#chatbot">
              <div className="action-icon green">💬</div>
              <div><strong>Ask the farm assistant</strong><small>Get answers to your questions</small></div>
              <b>→</b>
            </a>
          </div>
        </section>

        <section className="panel alerts-panel dashboard-panel dashboard-alerts-panel">
          <div className="panel-header dashboard-panel-header">
            <div><h2>Farm Alerts</h2><p>Observations that may need your attention</p></div>
            <span className="alert-count">3 updates</span>
          </div>
          <div className="alerts dashboard-alerts">
            <div className="alert alert-red"><div className="alert-symbol">!</div><div><strong>Possible leaf disease</strong><span>Review the tomato scan and follow the advisory carefully.</span></div><small>Today</small></div>
            <div className="alert alert-orange"><div className="alert-symbol">⚠</div><div><strong>Pest observation</strong><span>Inspect the affected crop area and confirm symptoms.</span></div><small>Today</small></div>
            <div className="alert alert-green"><div className="alert-symbol">✓</div><div><strong>Healthy crop result</strong><span>The latest rice crop scan was marked healthy.</span></div><small>Yesterday</small></div>
          </div>
        </section>
<section className="view-analytics-card">
  <div>
    <h3>View Detailed Analytics</h3>
    <p>Explore your farm activity and crop health insights.</p>
  </div>
  <a href="#analytics">View Analytics →</a>
</section>
        <footer className="dashboard-footer"><span>AgriVision AI © 2026</span><span>AI-powered farm monitoring and advisory</span></footer>
      </main>
    </div>
  );
}

export default Dashboard;
