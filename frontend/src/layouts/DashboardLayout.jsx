import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../context/ThemeContext";
import BottomNav from "../components/BottomNav";
import "../styles/layouts/DashboardLayout.css"

function DashboardLayout() {
  const { theme } = useTheme();

  return (
    <>
      <div className={`dashboard-layout ${theme === "dark" ? "dark-theme" : ""}`}>
        <Sidebar />
        <BottomNav />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default DashboardLayout;