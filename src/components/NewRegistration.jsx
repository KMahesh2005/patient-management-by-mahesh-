import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegistrationForm.css';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const NewRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    outpatientNo: '',
    regNo: '',
    admitDate: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patientName: '',
    motherName: '',
    fatherName: '',
    address: '',
    gender: '',
    maritalStatus: 'unmarried',
    spouseName: '',
    dob: '',
    age: '',
    weight: '',
    bloodGroup: '',
    email: '',
    consultantDoctor: '',
    referenceDoctor: '',
    operatorName: auth.currentUser?.displayName || localStorage.getItem('username') || '',
    mediaFile: null,
    mediaUrl: null,
    mediaPublicId: null
  });

  const [mediaPreview, setMediaPreview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);
  const [isRestrictedMode, setIsRestrictedMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [actionType, setActionType] = useState(null);

  // Function to generate the next outpatient number
  const generateOutpatientNo = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const patientsData = querySnapshot.docs.map(doc => doc.data());
      
      const outpatientNumbers = patientsData
        .map(patient => patient.outpatientNo)
        .filter(no => no && no.match(/^\d+$/))
        .map(Number);
      
      const highestNumber = outpatientNumbers.length > 0 
        ? Math.max(...outpatientNumbers) 
        : 0;
      
      return (highestNumber + 1).toString().padStart(6, '0');
    } catch (err) {
      console.error('Error generating outpatient number:', err);
      return '';
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const newOutpatientNo = await generateOutpatientNo();
        setFormData(prev => ({ ...prev, outpatientNo: newOutpatientNo }));

        const querySnapshot = await getDocs(collection(db, 'patients'));
        const patientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPatients(patientsData);
      } catch (err) {
        setError('Failed to fetch initial data: ' + err.message);
      }
    };
    fetchInitialData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload an image (JPEG/PNG) file.');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size exceeds 10MB limit.');
        return;
      }

      setFormData(prev => ({ ...prev, mediaFile: file }));
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, mediaFile: null, mediaUrl: null, mediaPublicId: null }));
    setMediaPreview(null);
    const fileInput = document.querySelector('input[name="mediaFile"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const cloudName = 'dckdkpq7d';
      const uploadPreset = 'ml_default';

      let mediaUrl = formData.mediaUrl || null;
      let mediaPublicId = formData.mediaPublicId || null;

      if (formData.mediaFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', formData.mediaFile);
        formDataToSend.append('upload_preset', uploadPreset);
        formDataToSend.append('folder', `patient-media/${formData.outpatientNo}`);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formDataToSend
          }
        );
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error.message);
        }
        mediaUrl = result.secure_url;
        mediaPublicId = result.public_id;
      }

      const patientData = {
        ...formData,
        mediaFile: null,
        mediaUrl,
        mediaPublicId,
        createdAt: new Date().toISOString()
      };

      if (isEditing && editingPatientId) {
        const patientRef = doc(db, 'patients', editingPatientId);
        await updateDoc(patientRef, patientData);
        setPatients(prev => prev.map(p => (p.id === editingPatientId ? { id: editingPatientId, ...patientData } : p)));
        alert('Patient information updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'patients'), patientData);
        setPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        alert('Patient registration submitted successfully!');
      }

      // Reset the form after successful submission
      await handleReset();
      
      // Generate new outpatient number after reset
      const newOutpatientNo = await generateOutpatientNo();
      setFormData(prev => ({ ...prev, outpatientNo: newOutpatientNo }));
      
      setIsEditing(false);
      setEditingPatientId(null);
      setIsRestrictedMode(true);
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit form: ' + err.message);
    }
  };

  const handleReset = async () => {
    const newOutpatientNo = await generateOutpatientNo();
    
    setFormData({
      outpatientNo: newOutpatientNo,
      regNo: '',
      admitDate: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: '',
      motherName: '',
      fatherName: '',
      address: '',
      gender: '',
      maritalStatus: 'unmarried',
      spouseName: '',
      dob: '',
      age: '',
      weight: '',
      bloodGroup: '',
      email: '',
      consultantDoctor: '',
      referenceDoctor: '',
      operatorName: auth.currentUser?.displayName || localStorage.getItem('username') || '',
      mediaFile: null,
      mediaUrl: null,
      mediaPublicId: null
    });
    
    setMediaPreview(null);
    setError(null);
    setIsRestrictedMode(false);
    setIsEditing(false);
    setEditingPatientId(null);
  };

  const handleEdit = () => {
    setShowPatientList(true);
    setActionType('edit');
  };

  const handleRemove = () => {
    setShowPatientList(true);
    setActionType('remove');
  };

  const handleSelectPatient = async (patient) => {
    if (actionType === 'edit') {
      setFormData({
        ...patient,
        mediaFile: null
      });
      setMediaPreview(patient.mediaUrl || null);
      setIsEditing(true);
      setEditingPatientId(patient.id);
      setIsRestrictedMode(false);
    } else if (actionType === 'remove') {
      if (window.confirm(`Are you sure you want to delete patient ${patient.patientName}?`)) {
        try {
          if (patient.mediaPublicId) {
            console.warn('Cloudinary image deletion requires a backend. Public ID:', patient.mediaPublicId);
          }
          await deleteDoc(doc(db, 'patients', patient.id));
          setPatients(prev => prev.filter(p => p.id !== patient.id));
          alert('Patient deleted successfully!');
        } catch (err) {
          setError('Failed to delete patient: ' + err.message);
        }
      }
    }
    setShowPatientList(false);
    setActionType(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'F5':
          handleReset();
          break;
        case 'F6':
          if (!isRestrictedMode) handleEdit();
          break;
        case 'F7':
          if (!isRestrictedMode) handleRemove();
          break;
        case 'Home':
          break;
        case 'PageUp':
          break;
        case 'PageDown':
          break;
        case 'End':
          break;
        case 'F8':
          document.querySelector('form').requestSubmit();
          break;
        case 'F9':
          setIsRestrictedMode(false);
          setIsEditing(false);
          setEditingPatientId(null);
          handleReset();
          break;
        case 'F12':
          if (window.confirm('Quit without saving?')) {
            navigate('/dashboard');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRestrictedMode, navigate]);

  return (
    <div className="page-content">
      <h1>New Registration</h1>
      {error && <div className="error-message">{error}</div>}
      <div className="registration-wrapper">
        <div className="registration-container">
          <h2>Outpatient Registration</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Registration Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Outpatient No:</label>
                  <input 
                    type="text" 
                    name="outpatientNo" 
                    value={formData.outpatientNo} 
                    onChange={handleChange} 
                    required 
                    readOnly 
                  />
                </div>
                <div className="form-group">
                  <label>Registration No:</label>
                  <input type="text" name="regNo" value={formData.regNo} onChange={handleChange} required />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Admit Date:</label>
                  <input type="date" name="admitDate" value={formData.admitDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Time:</label>
                  <input type="time" name="time" value={formData.time} onChange={handleChange} required />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Patient Information</h3>
              <div className="form-group">
                <label>Full Name:</label>
                <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} required />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Mother's Name:</label>
                  <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Father's Name:</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Address:</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  rows="3" 
                  placeholder="Enter patient's address"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Gender:</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marital Status:</label>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                    <option value="unmarried">Unmarried</option>
                    <option value="married">Married</option>
                  </select>
                </div>
              </div>
              
              {formData.maritalStatus === 'married' && (
                <div className="form-group">
                  <label>
                    {formData.gender === 'female' ? 'Husband Name' : 
                     formData.gender === 'male' ? 'Wife Name' : 'Spouse Name'}
                  </label>
                  <input type="text" name="spouseName" value={formData.spouseName} onChange={handleChange} />
                </div>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Age:</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} required />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg):</label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Blood Group:</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>Doctor Information</h3>
              <div className="form-group">
                <label>Consultant Doctor:</label>
                <input type="text" name="consultantDoctor" value={formData.consultantDoctor} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Reference Doctor:</label>
                <input type="text" name="referenceDoctor" value={formData.referenceDoctor} onChange={handleChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>Operator Information</h3>
              <div className="form-group">
                <label>Operator Name:</label>
                <input type="text" name="operatorName" value={formData.operatorName} onChange={handleChange} required readOnly />
              </div>
            </div>

            <div className="form-section">
              <h3>Media Upload</h3>
              <div className="form-group">
                <label>Upload Image (max 10MB):</label>
                <input 
                  type="file" 
                  name="mediaFile" 
                  accept="image/jpeg,image/png" 
                  onChange={handleFileChange} 
                />
                {mediaPreview && (
                  <div className="media-preview">
                    <img src={mediaPreview} alt="Patient photo preview" className="preview-image" />
                    <button 
                      type="button" 
                      className="remove-media-btn" 
                      onClick={handleRemoveFile}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">Submit</button>
              <button type="button" className="reset-btn" onClick={handleReset}>Reset</button>
            </div>
          </form>
        </div>

        <div className="action-buttons">
          <button 
            type="button" 
            className="action-btn new" 
            onClick={handleReset} 
            title="New (F5)"
          >
            NEW - F5
          </button>
          <button 
            type="button" 
            className="action-btn edit" 
            onClick={handleEdit} 
            title="Edit (F6)" 
            disabled={isRestrictedMode}
          >
            EDIT - F6
          </button>
          <button 
            type="button" 
            className="action-btn delete" 
            onClick={handleRemove} 
            title="Delete (F7)" 
            disabled={isRestrictedMode}
          >
            REMOVE - F7
          </button>
          <button 
            type="button" 
            className="action-btn review" 
            onClick={() => {}} 
            title="Review" 
            disabled={isRestrictedMode}
          >
            REVIEW
          </button>
          <button 
            type="button" 
            className="action-btn first" 
            onClick={() => {}} 
            title="First (Home)" 
            disabled={isRestrictedMode}
          >
            FIRST - Hm
          </button>
          <button 
            type="button" 
            className="action-btn next" 
            onClick={() => {}} 
            title="Next (PgDn)" 
            disabled={isRestrictedMode}
          >
            NEXT - PgDn
          </button>
          <button 
            type="button" 
            className="action-btn prev" 
            onClick={() => {}} 
            title="Prev (PgUp)" 
            disabled={isRestrictedMode}
          >
            PREV - PgUp
          </button>
          <button 
            type="button" 
            className="action-btn last" 
            onClick={() => {}} 
            title="Last (End)" 
            disabled={isRestrictedMode}
          >
            LAST - END
          </button>
          <button 
            type="button" 
            className="action-btn ok" 
            onClick={() => document.querySelector('form').requestSubmit()} 
            title="OK (F8)"
          >
            OK - F8
          </button>
          <button 
            type="button" 
            className="action-btn cancel" 
            onClick={() => {setIsRestrictedMode(false); setIsEditing(false); setEditingPatientId(null); handleReset();}} 
            title="Cancel (F9)"
          >
            CANCEL - F9
          </button>
          <button 
            type="button" 
            className="action-btn quit" 
            onClick={() => window.confirm('Quit form?') && navigate('/dashboard')} 
            title="Quit (F12)"
          >
            QUIT - F12
          </button>
        </div>
      </div>

      {showPatientList && (
        <div className="patient-list-modal">
          <div className="patient-list-content">
            <h3>Select Patient to {actionType === 'edit' ? 'Edit' : 'Remove'}</h3>
            <button 
              className="close-modal-btn" 
              onClick={() => {setShowPatientList(false); setActionType(null);}}
            >
              Close
            </button>
            <ul>
              {patients.map(patient => (
                <li 
                  key={patient.id} 
                  onClick={() => handleSelectPatient(patient)} 
                  className="patient-item"
                >
                  {patient.patientName} (Outpatient No: {patient.outpatientNo})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRegistration;