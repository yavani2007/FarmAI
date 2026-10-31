
import { useState } from "react";
import "./Login.css";

const API_URL = "http://127.0.0.1:8000";

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    setMessage("");
    setMessageType("");
    setLoading(true);

    const form = new FormData(formElement);

    const payload = isSignUp
      ? {
          name: form.get("name").trim(),
          email: form.get("email").trim(),
          password: form.get("password"),
        }
      : {
          email: form.get("email").trim(),
          password: form.get("password"),
        };

    try {
      const response = await fetch(
        `${API_URL}/${isSignUp ? "signup" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      setMessage(
        isSignUp
          ? "Account created successfully! You can now sign in."
          : `Welcome back, ${data.user.name}! Login successful.`
      );
      setMessageType("success");

      if (isSignUp) {
        formElement.reset();
        setTimeout(() => {
          setIsSignUp(false);
          setMessage("");
        }, 1500);
      } else {
        // Demo login: remember the user in this browser tab.
        sessionStorage.setItem("agrivisionUser", JSON.stringify(data.user));

        setTimeout(() => {
          window.location.hash = "#dashboard";
        }, 1000);
      }
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? "Cannot connect to the server. Please check whether the backend is running."
          : error.message
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <a className="login-brand" href="#home">
        <span className="brand-mark">🌿</span>
        <span className="brand-name">
          AgriVision <b>AI</b>
          <small>SMART CROP INTELLIGENCE</small>
        </span>
      </a>

      <section className="login-layout">
        <div className="login-welcome">
          <p className="login-tag">YOUR FARM. YOUR FUTURE.</p>
          <h1>
            Grow smarter.
            <br />
            <span>Harvest better.</span>
          </h1>
          <p>
            Discover smarter crop insights, understand plant
            health, and make informed farming decisions with
            AgriVision AI.
          </p>

          <div className="welcome-feature-card">
            <span className="welcome-feature-icon">🌱</span>
            <div>
              <strong>Every crop has a story.</strong>
              <p>Let AI help you understand it.</p>
            </div>
          </div>

          <div className="login-trust-line">
            <span>✓</span> Smart insights · Better decisions
          </div>
        </div>

        <div className="login-card-scene">
          <div className={`login-flip-card ${isSignUp ? "is-flipped" : ""}`}>
            {/* SIGN IN */}
            <div className="login-card login-card-front">
              <div className="login-heading">
                <div className="login-card-icon">🌾</div>
                <div>
                  <p className="form-eyebrow">WELCOME BACK</p>
                  <h2>Sign in</h2>
                </div>
              </div>

              <p className="login-subtitle">
                Your farm dashboard is waiting for you.
              </p>

              <form onSubmit={handleSubmit}>
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <label htmlFor="login-password">Password</label>
                <div className="password-wrap">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="login-options">
                  <label className="remember-label">
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <a href="#forgot-password">Forgot password?</a>
                </div>

                <button
                  className="login-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Sign In"} <span>→</span>
                </button>
              </form>

              <p className="login-signup">
                New to AgriVision AI?{" "}
                <button
                  type="button"
                  className="flip-link"
                  onClick={() => {
                    setShowPassword(false);
                    setMessage("");
                    setIsSignUp(true);
                  }}
                >
                  Create account
                </button>
              </p>

              <p className="login-disclaimer">
                Smart farming starts with a single step.
              </p>
            </div>

            {/* SIGN UP */}
            <div className="login-card login-card-back">
              <div className="login-heading">
                <div className="login-card-icon">🌱</div>
                <div>
                  <p className="form-eyebrow">START YOUR JOURNEY</p>
                  <h2>Create account</h2>
                </div>
              </div>

              <p className="login-subtitle">
                Join us for smarter farming decisions.
              </p>

              <form onSubmit={handleSubmit}>
                <label htmlFor="signup-name">Full name</label>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />

                <label htmlFor="signup-email">Email address</label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <label htmlFor="signup-password">Create password</label>
                <div className="password-wrap">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <button
                  className="login-submit signup-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Create Account"} <span>→</span>
                </button>
              </form>

              <p className="login-signup">
                Already have an account?{" "}
                <button
                  type="button"
                  className="flip-link"
                  onClick={() => {
                    setShowPassword(false);
                    setMessage("");
                    setIsSignUp(false);
                  }}
                >
                  Sign in
                </button>
              </p>

              <p className="login-disclaimer">
                Your journey towards smarter farming begins here.
              </p>
            </div>
          </div>

          {message && (
            <p
              role="status"
              className={`auth-message ${messageType}`}
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </div>
      </section>

      <footer className="login-footer">
        <span>© 2026 AgriVision AI</span>
        <span> · Smart Crop Intelligence. Better Farm Decisions.</span>
      </footer>
    </main>
  );
}

export default Login;