import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ReadBooks from "./pages/ReadBooks";
import Wishlist from "./pages/Wishlist";
import ManageBackend from "./pages/ManageBackend";
import NavBar from "./components/NavBar";
import DashboardLayout from "./layouts/DashboardLayout";
import { useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import { useAuth } from "./context/AuthContext";

function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, []);

  return <Navigate to="/login" />;
}

function RegisterAndLogout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, []);

  return <Register />;
}

function AppFooter() {
  const location = useLocation();
  if (location.pathname !== "/") return null;
  return <Footer />;
}

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />

        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/readbooks"
            element={
              <ProtectedRoute>
                <ReadBooks />
              </ProtectedRoute>
            }
          />
        </Route>


        {/* 🛠️ Custom Admin Workspace Route */}
        <Route path="/manage/backend" element={<ManageBackend />} />
      </Routes>
      <AppFooter />
    </>

  );
}

export default App;
