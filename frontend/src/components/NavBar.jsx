import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, NavLink } from "react-router-dom";
import React, { useState, useEffect, useRef } from 'react'
import "../styles/components/NavBar.css"
import logo from "../assets/logo.png";

const NavBar = () => {
    const [open, setOpen] = useState(false);
    const { isAuthenticated, user, logout, loading } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (loading) return null;

    return (
        <nav className="navbar flex">
            <Link className="home-link" to="/"><img src={logo} alt="Logo" className="logo" /></Link>
            {isAuthenticated ? (
                <div className="nav-container flex">
                    <span>Wishlists: {user.wishlists_count}</span>
                    <span>Read Books: {user.readbooks_count}</span>
                    <NavLink
                        to="/dashboard"
                        state={{ focusSearch: true }}
                        className="nav-link"
                    >
                        Search
                    </NavLink>
                    <div ref={menuRef} style={{ position: "relative" }}>
                        <button
                            className="nav-user-trigger"
                            onClick={() => setOpen((o) => !o)}
                        >
                            <i className="fa-solid fa-user"></i>
                            {
                                user.username.length > 15
                                    ? user.username.slice(0, 13) + "..."
                                    : user.username
                            }
                            {!open ?
                                <i className="fa-solid fa-caret-down"></i>
                                : <i className="fa-solid fa-caret-up"></i>}
                        </button>

                        {open && (
                            <div
                                role="menu"
                                className="dropdown-menu"
                            >
                                <div className="content-dropdown">{`Username: ${user.username}`}</div>
                                <div className="logout-div">
                                    <button
                                        role="menuitem"
                                        onClick={() => {
                                            setOpen(false);
                                            handleLogout();
                                        }}
                                        className="dropdown-button"
                                    >
                                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                        Logout
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="loggedout-div">
                    <Link className="nav-link" to="/login">Login</Link>
                    <Link className="nav-link" to="/register">Register</Link>
                </div>
            )}
        </nav>
    )
}

export default NavBar
