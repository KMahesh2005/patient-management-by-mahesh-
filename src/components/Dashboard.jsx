import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('patients');
    navigate('/');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <img
          src="https://images.unsplash.com/photo-1584982751601-97dcc096659c"
          alt="Patient Management System"
          className="dashboard-image"
        />
        <div className="dashboard-overlay">
          <h1>Admin Dashboard</h1>
          <p>Welcome to the Patient Management System</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Patients</h3>
            <p>150</p>
          </div>
          <div className="stat-card"> 
            <h3>Today's Registrations</h3>
            <p>10</p> 
          </div> 
        </div>

        <div className="quick-links">
          <Link to="/new-registration" className="dashboard-link">New Registration</Link>
          <Link to="/outpatient-details" className="dashboard-link">Outpatient Details</Link>
          <Link to="/profile" className="dashboard-link">My Profile</Link>
          <button onClick={handleLogout} className="dashboard-link logout-btn">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;