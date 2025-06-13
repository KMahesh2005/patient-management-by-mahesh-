import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  // Same adminProfile data as in Profile.jsx
  const [adminProfile, setAdminProfile] = useState({
    name: "Admin User",
    email: "admin@hospital.com",
    role: "Super Admin",
    lastLogin: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    avatar: "https://www.shutterstock.com/image-photo/clipboard-portrait-doctor-office-healthcare-260nw-2472682625.jpg"
  });

  // Fetch username from localStorage (consistent with Profile.jsx)
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) {
      setAdminProfile(prev => ({
        ...prev,
        name: username
      }));
    }
  }, []);

  const handleLogout = () => {
    localStorage.setItem('isAuthenticated', 'false');
    localStorage.removeItem('username');
    localStorage.removeItem('patients');
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <Link to="/dashboard">Hospital Management</Link>
        </div>
        <div className="navbar-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/new-registration">New Registration</Link>
          <Link to="/outpatient-details">Outpatient Details</Link>
        </div>
      </div>

      <div className="navbar-right">
        <div 
          className="profile-dropdown" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <img src={adminProfile.avatar} alt="Profile" className="profile-avatar" />
          <span className="profile-name">{adminProfile.name}</span>
          <i className={`fas fa-chevron-${showDropdown ? 'up' : 'down'}`}></i>
          
          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <img src={adminProfile.avatar} alt="Profile" />
                <div>
                  <div className="profile-name">{adminProfile.name}</div>
                  <div className="profile-role">{adminProfile.role}</div>
                </div>
              </div>
              <Link to="/profile" className="dropdown-item">
                <i className="fas fa-user-cog"></i> My Profile
              </Link>
              <Link to="/settings" className="dropdown-item">
                <i className="fas fa-cog"></i> Settings
              </Link>
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;