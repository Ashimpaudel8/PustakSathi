import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/components/BottomNav.css";

function BottomNav() {
    const [profileOpen, setProfileOpen] = useState(false);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        setProfileOpen(false);
        logout();
        navigate("/login");
    };

    return (
        <nav className={`bottom-nav${profileOpen ? " profile-active" : ""}`}>
            <NavLink
                to="/dashboard"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-magnifying-glass"></i>
                <span className="bottom-nav-label">Search</span>
            </NavLink>
            <NavLink
                to="/wishlist"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-heart"></i>
                <span className="bottom-nav-label">Wishlists</span>
            </NavLink>
            <NavLink
                to="/readbooks"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-book"></i>
                <span className="bottom-nav-label">ReadBooks</span>
            </NavLink>

            {profileOpen && (
                <div className="bottom-nav-overlay" onClick={() => setProfileOpen(false)} />
            )}
            <div className="bottom-nav-profile">
                <button className={`bottom-nav-link${profileOpen ? " active" : ""}`} onClick={() => setProfileOpen((o) => !o)}>
                    <i className="fa-solid fa-user"></i>
                </button>

                {profileOpen && (
                    <div className="bottom-nav-sheet">
                        <div className="bottom-nav-sheet-username">
                            <i className="fa-solid fa-user"></i> {user?.username}
                        </div>
                        <button className="bottom-nav-sheet-item" onClick={toggleTheme}>
                            {theme === "light" ? (
                                <><i className="fa-solid fa-moon"></i> Dark Mode</>
                            ) : (
                                <><i className="fa-solid fa-sun"></i> Light Mode</>
                            )}
                        </button>
                        <button className="bottom-nav-sheet-item logout" onClick={handleLogout}>
                            <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default BottomNav;