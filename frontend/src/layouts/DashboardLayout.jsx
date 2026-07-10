import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/layouts/DashboardLayout.css"

function DashboardLayout() {
    return (
        <>
            <div className="dashboard-layout">
                <Sidebar />

                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </>
    );
}

export default DashboardLayout;