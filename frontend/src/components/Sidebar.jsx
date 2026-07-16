import React from 'react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react';
import "../styles/components/Sidebar.css"

function SideBar() {
  const [collapsed, setCollapsed] = useState(false);
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
          state={{ focusSearch: true }}
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
          <i className="fa-solid fa-bookmark"></i>
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
