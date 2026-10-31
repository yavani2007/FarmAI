
import { useEffect, useState } from "react";
import "./Home.css";

const features = [
  {
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=85",
    icon: "🔬",
    title: "AI Crop Detection",
    text: "Upload crop images to identify possible diseases and crop problems.",
    link: "Analyze crops",
    href: "#scanner",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=85",
    icon: "🌱",
    title: "Smart Advisory",
    text: "Explore practical recommendations to support healthier crop care.",
    link: "View advice",
    href: "#advisory",
  },
  {
    image:
      "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=800&q=85",
    icon: "📊",
    title: "Farm Monitoring",
    text: "Review your previous crop scans and follow your farm analysis.",
    link: "View history",
    href: "#monitoring",
  },
  {
    image:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=85",
    icon: "💬",
    title: "AI Farming Assistant",
    text: "Ask agricultural questions and explore easy-to-understand guidance.",
    link: "Ask a question",
    href: "#chatbot",
  },
];

function Home() {
  const [activeSection, setActiveSection] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = ["home", "about-home", "features"];
    const handleScroll = () => {
      let current = "home";

      sections.forEach((id) => {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 150) {
          current = id;
        }
      });

      setActiveSection(
        current === "about-home"
          ? "about"
          : current === "features"
            ? "features"
            : "home"
      );
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="home-page" id="home">
      <nav className="home-navbar">
        <a
          className="home-logo"
          href="#home"
          onClick={() => {
            setActiveSection("home");
            closeMenu();
          }}
        >
          <span className="brand-mark" aria-hidden="true">🌿</span>
          <span className="brand-name">
            AgriVision <b>AI</b>
          </span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`home-nav-links ${menuOpen ? "menu-open" : ""}`}>
          <a
            className={activeSection === "home" ? "active" : ""}
            href="#home"
            onClick={() => {
              setActiveSection("home");
              closeMenu();
            }}
          >
            Home
          </a>
          <a
            className={activeSection === "about" ? "active" : ""}
            href="#about-home"
            onClick={() => {
              setActiveSection("about");
              closeMenu();
            }}
          >
            About
          </a>
          <a
            className={activeSection === "features" ? "active" : ""}
            href="#features"
            onClick={() => {
              setActiveSection("features");
              closeMenu();
            }}
          >
            Features
          </a>
          <a href="#chatbot" onClick={closeMenu}>
            AI Assistant
          </a>
        </div>

        <a className="home-login-btn" href="#login">
          <span aria-hidden="true">♙</span> Login →
        </a>
      </nav>

      <section className="home-hero">
        <div className="hero-content">
          <p className="hero-tag">🌿 INTELLIGENT FARMING, SIMPLIFIED</p>
          <h1>
            Grow Smarter.
            <br />
            <span>Farm Better.</span>
          </h1>
          <p className="hero-description">
            Bring smarter crop care to your fingertips with AI-powered crop
            analysis, helpful agricultural advice, and farm monitoring — all
            in one place.
          </p>

          
<div className="hero-buttons">
  <a className="primary-btn" href="#scanner">
    Analyze Your Crop ↗
  </a>
  <a className="secondary-btn" href="#features">
    Explore Features
  </a>
  <div className="welcome-inline">
    <span className="image-card-icon">🌾</span>
    <div>
      <strong>Welcome to smarter farming</strong>
      <p>Better information. Better decisions.</p>
    </div>
  </div>
</div>

<div className="hero-note">
  <span>✓</span> AI-powered insights
  <span>✓</span> Practical crop guidance
</div>
</div>
        <div className="hero-image">
          <img
            src="/farmer_hero.png"
            alt="Sunlight over a green countryside landscape"
          />
        </div>
      </section>

      <section className="home-about" id="about-home">
        <div className="about-image">
          <img
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=85"
            alt="Green agricultural fields and countryside"
            loading="lazy"
          />
        </div>

        <div className="about-content">
          <p className="about-tag">ABOUT AGRIVISION AI</p>
          <h2>Technology that supports every farmer.</h2>
          <p>
            AgriVision AI is an AI-based farm monitoring and advisory system
            that helps users explore possible crop problems through image
            analysis.
          </p>
          <p>
            It brings crop insights, agricultural information, and an AI
            assistant together to make farming guidance easier to access.
            AI results are suggestions and should be verified when crop
            problems are serious or unclear.
          </p>
          <a className="primary-btn" href="#scanner">
            Get Started ↗
          </a>
        </div>
      </section>

      <section className="home-features" id="features">
        <div className="section-heading">
          <p>OUR SMART FARMING TOOLS</p>
          <h2>Everything your farm needs to grow</h2>
          <span>
            Explore simple digital tools designed to support your crop-care
            decisions.
          </span>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <a
              className="feature-card"
              href={feature.href}
              key={feature.title}
            >
              <img
                className="feature-photo"
                src={feature.image}
                alt={feature.title}
                loading="lazy"
              />
              <div className="feature-card-content">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <span className="feature-link">{feature.link} →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <p>YOUR FARM. YOUR FUTURE.</p>
        <h2>Let’s grow a smarter future together.</h2>
        <a href="#scanner">Start Crop Analysis ↗</a>
      </section>

      <footer className="home-footer">
        <a className="home-logo" href="#home">
          <span className="brand-mark" aria-hidden="true">🌿</span>
          <span className="brand-name">
            AgriVision <b>AI</b>
          </span>
        </a>
        <p>Smart Crop Intelligence. Better Farm Decisions.</p>
        <span>© 2026 AgriVision AI</span>
      </footer>
    </main>
  );
}

export default Home;