import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react';
import "../styles/components/Sidebar.css"

function SideBar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isOnDashboard = location.pathname === "/dashboard";
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className="hamburger"
        onClick={() => setCollapsed(!collapsed)}
      >
        <i className="fa-solid fa-bars"></i>
      </button>
      <div className="side-link-container">
        <NavLink to="/dashboard"
          state={isOnDashboard ? { resetToDiscover: true } : undefined}
          className={({ isActive }) =>
            isActive ? "side-link active" : "side-link"
          }>
          <i className="fa-solid fa-magnifying-glass"></i>
          {!collapsed && "Search"}
        </NavLink>
        <NavLink to="/wishlist"
          className={({ isActive }) =>
            isActive ? "side-link active" : "side-link"
          }>
          <i className="fa-solid fa-heart"></i>
          {!collapsed && "Wishlists"}
        </NavLink>
        <NavLink to="/readbooks"
          className={({ isActive }) =>
            isActive ? "side-link active" : "side-link"
          }>
          <i className="fa-solid fa-book"></i>
          {!collapsed && "ReadBooks"}
        </NavLink>
      </div>
    </aside>
  )
}

export default SideBar
