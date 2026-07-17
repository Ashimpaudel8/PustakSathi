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
    const profileRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        setProfileOpen(false);
        logout();
        navigate("/login");
    };

    return (
        <nav className="bottom-nav">
            <NavLink
                to="/dashboard"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-magnifying-glass"></i>
            </NavLink>
            <NavLink
                to="/wishlist"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-heart"></i>
            </NavLink>
            <NavLink
                to="/readbooks"
                className={({ isActive }) => isActive ? "bottom-nav-link active" : "bottom-nav-link"}
            >
                <i className="fa-solid fa-book"></i>
            </NavLink>

            <div className="bottom-nav-profile" ref={profileRef}>
                <button className="bottom-nav-link" onClick={() => setProfileOpen((o) => !o)}>
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