import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api";
import { Access_Token, Refresh_Token } from "../constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initAuth();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await api.get("api/user/me/");
            setUser(res.data);
            setIsAuthenticated(true);
        } catch (err) {
            logout();
        }
    };

    const initAuth = async () => {
        const token = localStorage.getItem(Access_Token);
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const now = Date.now() / 1000;

            if (decoded.exp < now) {
                await refreshToken();
            } else {
                await fetchUser();
                setIsAuthenticated(true);
            }
        } catch (err) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const refreshToken = async () => {
        const refresh = localStorage.getItem(Refresh_Token);
        try {
            const res = await api.post("api/token/refresh/", { refresh });
            localStorage.setItem(Access_Token, res.data.access);
            await fetchUser();
            setIsAuthenticated(true);
        } catch (err) {
            logout();
        }
    };

    const login = async (tokens) => {
        localStorage.setItem(Access_Token, tokens.access);
        localStorage.setItem(Refresh_Token, tokens.refresh);
        await fetchUser();
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem(Access_Token);
        localStorage.removeItem(Refresh_Token);
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);