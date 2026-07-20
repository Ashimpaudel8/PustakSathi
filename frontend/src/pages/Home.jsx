import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/pages/Home.css";

function Home() {
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();

  return (
    <div className={`home-page ${theme === "dark" ? "dark-theme" : ""}`}>
      {/* ================= HERO ================= */}
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="home-eyebrow">Search &bull; Recommend &bull; Read</span>
          <h1 className="home-title">PustakSathi</h1>

          {/* PLACEHOLDER — swap this line for your one-liner tagline joke */}
          <p className="home-tagline">Recommends books, not recipes - still nails your taste.</p>

          <p className="home-subtext">
            Find any book by title or ISBN, get recommendations tuned to your
            taste, and keep a wishlist and reading history that grows smarter
            with every book you search, save, or finish.
          </p>

          <div className="home-cta-row">
            {isAuthenticated ? (
              <Link to="/dashboard" className="home-cta primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="home-cta primary">
                  Get Started Free
                </Link>
                <Link to="/login" className="home-cta secondary">
                  I already have an account
                </Link>
              </>
            )}
          </div>

          {isAuthenticated && (
            <p className="home-welcome-back">
              Welcome back, {user?.username}. Pick up right where you left off.
            </p>
          )}
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="mock-card">
            <div className="mock-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <span>The Alchemist</span>
            </div>
            <div className="mock-tile">
              <div className="mock-cover"></div>
              <div className="mock-lines">
                <span className="mock-line long"></span>
                <span className="mock-line short"></span>
              </div>
              <i className="fa-solid fa-heart mock-badge wishlist"></i>
            </div>
            <div className="mock-tile">
              <div className="mock-cover alt"></div>
              <div className="mock-lines">
                <span className="mock-line long"></span>
                <span className="mock-line short"></span>
              </div>
              <i className="fa-solid fa-check mock-badge read"></i>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="home-features">
        <h2 className="home-section-title">Everything you need to find your next read</h2>

        <div className="home-feature-grid">
          <div className="feature-card">
            <i className="fa-solid fa-magnifying-glass"></i>
            <h3>Search Two Ways</h3>
            <p>Look up any title, or paste an ISBN for a pinpoint match.</p>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <h3>Tailored Recommendations</h3>
            <p>Every search, wishlist add, and finished book sharpens what's suggested next.</p>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-heart"></i>
            <h3>Wishlist It</h3>
            <p>Save books you want to read later, right from any result.</p>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-book"></i>
            <h3>Mark & Rate</h3>
            <p>Log books you've finished and rate them to guide future picks.</p>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-compass"></i>
            <h3>Discover Something New</h3>
            <p>Land on curated picks the moment you open your dashboard.</p>
          </div>

          <div className="feature-card">
            <i className="fa-solid fa-circle-half-stroke"></i>
            <h3>Day or Night</h3>
            <p>Toggle dark mode anywhere in the app — it remembers your choice.</p>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="home-steps">
        <h2 className="home-section-title">Get going in three steps</h2>

        <div className="home-steps-row">
          <div className="step-card">
            <span className="step-number">1</span>
            <h3>Create your shelf</h3>
            <p>Register in seconds, no clutter, no fuss.</p>
          </div>
          <div className="step-card">
            <span className="step-number">2</span>
            <h3>Search or browse</h3>
            <p>Find a title, paste an ISBN, or just explore what's discovered for you.</p>
          </div>
          <div className="step-card">
            <span className="step-number">3</span>
            <h3>Save & track</h3>
            <p>Wishlist it, mark it read, rate it, and let recommendations improve.</p>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      {!isAuthenticated && (
        <section className="home-final-cta">
          <h2>Ready to find your next book?</h2>
          <Link to="/register" className="home-cta primary">
            Create Your Free Account
          </Link>
        </section>
      )}
    </div>
  );
}

export default Home;