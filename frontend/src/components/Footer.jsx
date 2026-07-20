import logo from "../assets/logo.png";
import { useTheme } from "../context/ThemeContext";
import "../styles/components/Footer.css";

const Footer = () => {
  const { theme } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className={`app-footer ${theme === "dark" ? "dark-theme" : ""}`}>
      <div className="footer-brand">
        <img src={logo} alt="PustakSathi Logo" className="footer-logo" />
        <div className="footer-brand-text">
          <span className="footer-name">PustakSathi</span>
          <span className="footer-tagline">Book Recommendation and Search App</span>
        </div>
      </div>

      <p className="footer-copyright">
        &copy; {year} PustakSathi. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;