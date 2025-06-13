import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Outlet 
} from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import NewRegistration from "./components/NewRegistration";
import OutPatientDetails from "./components/OutPatientDetails";
import Profile from "./components/Profile";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  return (
    <Router>
      <Routes>
        
        <Route path="/" element={<Login />} />
        
        
        <Route element={<LayoutWithNavbar />}>
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/new-registration" 
            element={isAuthenticated ? <NewRegistration /> : <Navigate to="/" />} 
          />
          <Route 
            path="/outpatient-details" 
            element={isAuthenticated ? <OutPatientDetails /> : <Navigate to="/" />} 
          />
          <Route 
            path="/profile" 
            element={isAuthenticated ? <Profile /> : <Navigate to="/" />} 
          />
        </Route>
        
        
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />} 
        />
      </Routes>
    </Router>
  );
}


function LayoutWithNavbar() {
  return (
    <>
      <Navbar />
      <div className="main-content with-navbar">
        <Outlet /> 
      </div>
    </>
  );
}


export default App;