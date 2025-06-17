import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalPatients, setTotalPatients] = useState(0);
  const [todaysRegistrations, setTodaysRegistrations] = useState(0);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const patientsData = [];
        const today = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        
        querySnapshot.forEach((doc) => {
          const patientData = doc.data();
          
          // Extract outpatient-related fields with fallbacks
          const patientRecord = {
            id: doc.id,
            outpatientNo: patientData.outpatientNo || patientData.opNumber || 'N/A',
            name: patientData.name || patientData.fullName || patientData.patientName || 'N/A',
            registrationNo: patientData.registrationNo || patientData.regNumber || 'N/A',
            admitDate: patientData.admitDate || 
                     patientData.admissionDate || 
                     patientData.registrationDate || 
                     patientData.createdAt || 
                     'N/A'
          };

          patientsData.push(patientRecord);

          // Check if registered today (using any date field)
          const regDate = patientData.admitDate || 
                         patientData.admissionDate || 
                         patientData.registrationDate || 
                         patientData.createdAt;
          if (regDate && regDate.split('T')[0] === today) {
            todayCount++;
          }
        });

        setPatients(patientsData);
        setTotalPatients(patientsData.length);
        setTodaysRegistrations(todayCount);
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching patients:', error);
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('patients');
    navigate('/');
  };

  const handleTotalPatientsClick = () => {
    setShowAllPatients(!showAllPatients);
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
          <div 
            className={`stat-card ${showAllPatients ? 'active' : ''}`} 
            onClick={handleTotalPatientsClick}
          >
            <h3>Total Patients</h3>
            {loading ? <p>Loading...</p> : <p>{totalPatients}</p>}
          </div>
          <div className="stat-card">
            <h3>Today's Registrations</h3>
            {loading ? <p>Loading...</p> : <p>{todaysRegistrations}</p>}
          </div>
        </div>

        {showAllPatients && (
          <div className="patients-list">
            <h3>All Patients ({totalPatients})</h3>
            {patients.length === 0 ? (
              <p>No patients found</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Outpatient No</th>
                      <th>Name</th>
                      <th>Registration No</th>
                      <th>Admit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.outpatientNo}</td>
                        <td>{patient.name}</td>
                        <td>{patient.registrationNo}</td>
                        <td>
                          {patient.admitDate === 'N/A' 
                            ? 'N/A' 
                            : new Date(patient.admitDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="quick-links">
          <Link to="/new-registration" className="dashboard-link">
            <i className="fas fa-user-plus"></i> New Registration
          </Link>
          <Link to="/outpatient-details" className="dashboard-link">
            <i className="fas fa-clipboard-list"></i> Outpatient Details
          </Link>
          <Link to="/profile" className="dashboard-link">
            <i className="fas fa-user-cog"></i> My Profile
          </Link>
          <button onClick={handleLogout} className="dashboard-link logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;