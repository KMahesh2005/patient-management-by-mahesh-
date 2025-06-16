import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OutPatientDetails.css';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const OutPatientDetails = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    outpatientNo: '',
    regNo: '',
    admitDate: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patientName: '',
    motherName: '',
    fatherName: '',
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
    operatorName: localStorage.getItem('username') || '',
    patientHistory: '',
    temperature: '',
    pulseRate: '',
    bloodPressure: '',
    reviewDate: '',
    mediaFile: null,
  });

  const [mediaPreview, setMediaPreview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOutpatientNoSearched, setIsOutpatientNoSearched] = useState(false);
  const [isPatientNameSearched, setIsPatientNameSearched] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate the next outpatient number
  const generateOutpatientNo = async () => {
    try {
      const q = query(
        collection(db, 'patients'),
        orderBy('outpatientNo', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      let lastNumber = 0;
      if (!querySnapshot.empty) {
        const lastPatient = querySnapshot.docs[0].data();
        lastNumber = parseInt(lastPatient.outpatientNo, 10) || 0;
      }
      
      const newNumber = lastNumber + 1;
      return newNumber.toString().padStart(6, '0');
    } catch (error) {
      console.error('Error generating outpatient number:', error);
      setError('Failed to generate outpatient number');
      return '';
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const patientList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPatients(patientList);
        
        const newOutpatientNo = await generateOutpatientNo();
        setFormData(prev => ({
          ...prev,
          outpatientNo: newOutpatientNo
        }));
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  const handleOutpatientNoChange = async (e) => {
    const outpatientNo = e.target.value;
    setFormData(prev => ({ ...prev, outpatientNo }));
    setIsEditing(false);
    setIsPatientNameSearched(false);
    setError(null);

    if (outpatientNo) {
      try {
        const q = query(collection(db, 'patients'), where('outpatientNo', '==', outpatientNo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const patient = querySnapshot.docs[0].data();
          const patientId = querySnapshot.docs[0].id;
          setFormData({
            ...patient,
            mediaFile: null,
            mediaUrl: patient.mediaUrl || null,
          });
          setMediaPreview(patient.mediaUrl || null);
          setSelectedPatientId(patientId);
          setIsOutpatientNoSearched(true);
        } else {
          setFormData(prev => ({
            ...prev,
            outpatientNo,
            regNo: '',
            patientName: '',
            motherName: '',
            fatherName: '',
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
            patientHistory: '',
            temperature: '',
            pulseRate: '',
            bloodPressure: '',
            reviewDate: '',
            mediaFile: null,
          }));
          setMediaPreview(null);
          setSelectedPatientId(null);
          setIsOutpatientNoSearched(false);
        }
      } catch (error) {
        console.error('Error fetching patient by Outpatient No:', error);
        setError('Failed to fetch patient by Outpatient No');
      }
    } else {
      handleReset();
    }
  };

  const handlePatientNameChange = async (e) => {
    const patientName = e.target.value;
    setFormData(prev => ({ ...prev, patientName }));
    setIsEditing(false);
    setIsOutpatientNoSearched(false);
    setError(null);

    if (patientName) {
      try {
        const q = query(collection(db, 'patients'), where('patientName', '==', patientName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const patient = querySnapshot.docs[0].data();
          const patientId = querySnapshot.docs[0].id;
          setFormData({
            ...patient,
            mediaFile: null,
            mediaUrl: patient.mediaUrl || null,
          });
          setMediaPreview(patient.mediaUrl || null);
          setSelectedPatientId(patientId);
          setIsPatientNameSearched(true);
        } else {
          setFormData(prev => ({
            ...prev,
            outpatientNo: prev.outpatientNo || '',
            regNo: '',
            patientName,
            motherName: '',
            fatherName: '',
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
            patientHistory: '',
            temperature: '',
            pulseRate: '',
            bloodPressure: '',
            reviewDate: '',
            mediaFile: null,
          }));
          setMediaPreview(null);
          setSelectedPatientId(null);
          setIsPatientNameSearched(false);
        }
      } catch (error) {
        console.error('Error fetching patient by Patient Name:', error);
        setError('Failed to fetch patient by name');
      }
    } else {
      handleReset();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload an image (JPEG/PNG) or video (MP4/WebM) file.');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size exceeds 10MB limit.');
        return;
      }

      setFormData(prev => ({ ...prev, mediaFile: file }));
      setMediaPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, mediaFile: null, mediaUrl: null }));
    setMediaPreview(null);
    const fileInput = document.querySelector('input[name="mediaFile"]');
    if (fileInput) fileInput.value = '';
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      let mediaUrl = formData.mediaFile ? null : formData.mediaUrl || null;
      if (formData.mediaFile) {
        const storageRef = ref(storage, `patient-media/${formData.outpatientNo}_${Date.now()}`);
        await uploadBytes(storageRef, formData.mediaFile);
        mediaUrl = await getDownloadURL(storageRef);
      }

      const patientData = { 
        ...formData,
        mediaUrl,
        admitDate: formData.admitDate || new Date().toISOString().split('T')[0],
        time: formData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        operatorName: localStorage.getItem('username') || '',
      };
      delete patientData.mediaFile;

      if (isEditing && selectedPatientId) {
        const patientRef = doc(db, 'patients', selectedPatientId);
        await updateDoc(patientRef, patientData);
        setPatients(prev => prev.map(p => (p.id === selectedPatientId ? { id: selectedPatientId, ...patientData } : p)));
      } else {
        const docRef = await addDoc(collection(db, 'patients'), patientData);
        setPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        
        // Generate new outpatient number after successful submission
        const newOutpatientNo = await generateOutpatientNo();
        setFormData(prev => ({ ...prev, outpatientNo: newOutpatientNo }));
      }
      
      setIsEditing(false);
      setIsOutpatientNoSearched(true);
    } catch (error) {
      console.error('Error saving patient:', error);
      setError('Failed to save patient data');
    }
  };

  const handleEdit = (patientToEdit) => {
    setFormData({
      ...patientToEdit,
      mediaFile: null,
      mediaUrl: patientToEdit.mediaUrl || null,
    });
    setMediaPreview(patientToEdit.mediaUrl || null);
    setSelectedPatientId(patientToEdit.id);
    setIsEditing(true);
    setIsOutpatientNoSearched(true);
    setIsPatientNameSearched(true);
    setError(null);
  };

  const handleDelete = async (patientId) => {
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      try {
        await deleteDoc(doc(db, 'patients', patientId));
        setPatients(prev => prev.filter(p => p.id !== patientId));
        if (selectedPatientId === patientId) handleReset();
        setError(null);
      } catch (error) {
        console.error('Error deleting patient:', error);
        setError('Failed to delete patient record');
      }
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
      operatorName: localStorage.getItem('username') || '',
      patientHistory: '',
      temperature: '',
      pulseRate: '',
      bloodPressure: '',
      reviewDate: '',
      mediaFile: null,
    });
    setMediaPreview(null);
    setSelectedPatientId(null);
    setIsEditing(false);
    setIsOutpatientNoSearched(false);
    setIsPatientNameSearched(false);
    setError(null);
  };

  const isFormReadOnly = (isOutpatientNoSearched || isPatientNameSearched) && !isEditing;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter') {
          e.preventDefault();
          const formElements = Array.from(e.target.form.elements);
          const index = formElements.indexOf(e.target);
          if (index > -1 && formElements[index + 1]) {
            formElements[index + 1].focus();
          }
        }
        return;
      }

      switch (e.key) {
        case 'F5':
          e.preventDefault();
          handleReset();
          break;
        case 'F6':
          e.preventDefault();
          if (selectedPatientId) {
            const patientToEdit = patients.find(p => p.id === selectedPatientId);
            if (patientToEdit) handleEdit(patientToEdit);
          } else if (patients.length > 0) {
            handleEdit(patients[0]);
          }
          break;
        case 'F7':
          e.preventDefault();
          if (selectedPatientId) handleDelete(selectedPatientId);
          break;
        case 'F8':
          e.preventDefault();
          handleSubmit(new Event('submit'));
          break;
        case 'F9':
          e.preventDefault();
          handleReset();
          break;
        case 'F12':
          e.preventDefault();
          if (window.confirm('Quit and go to dashboard?')) {
            navigate('/dashboard');
          }
          break;
        case 'Home':
          e.preventDefault();
          if (patients.length > 0) handleEdit(patients[0]);
          break;
        case 'End':
          e.preventDefault();
          if (patients.length > 0) handleEdit(patients[patients.length - 1]);
          break;
        case 'PageDown':
          e.preventDefault();
          if (selectedPatientId) {
            const currentIndex = patients.findIndex(p => p.id === selectedPatientId);
            if (currentIndex !== -1 && currentIndex < patients.length - 1) {
              handleEdit(patients[currentIndex + 1]);
            }
          } else if (patients.length > 0) {
            handleEdit(patients[0]);
          }
          break;
        case 'PageUp':
          e.preventDefault();
          if (selectedPatientId) {
            const currentIndex = patients.findIndex(p => p.id === selectedPatientId);
            if (currentIndex > 0) {
              handleEdit(patients[currentIndex - 1]);
            }
          } else if (patients.length > 0) {
            handleEdit(patients[patients.length - 1]);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patients, selectedPatientId, isEditing, navigate]);

  if (isLoading) {
    return <div className="page-content">Loading...</div>;
  }

  return (
    <div className="page-content">
      <h1>Out-Patient Details</h1>
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

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
                    onChange={handleOutpatientNoChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Registration No:</label>
                  <input
                    type="text"
                    name="regNo"
                    value={formData.regNo}
                    onChange={handleChange}
                    required
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Admit Date:</label>
                  <input
                    type="date"
                    name="admitDate"
                    value={formData.admitDate}
                    onChange={handleChange}
                    required
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Time:</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Patient Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Patient Name:</label>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handlePatientNameChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender:</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    disabled={isFormReadOnly}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mother's Name:</label>
                  <input
                    type="text"
                    name="motherName"
                    value={formData.motherName}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Father's Name:</label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marital Status:</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleChange}
                    disabled={isFormReadOnly}
                  >
                    <option value="unmarried">Unmarried</option>
                    <option value="married">Married</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Spouse Name:</label>
                  <input
                    type="text"
                    name="spouseName"
                    value={formData.spouseName}
                    onChange={handleChange}
                    readOnly={isFormReadOnly || formData.maritalStatus !== 'married'}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Age:</label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg):</label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Blood Group:</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    disabled={isFormReadOnly}
                  >
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
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Doctor Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Consultant Doctor:</label>
                  <input
                    type="text"
                    name="consultantDoctor"
                    value={formData.consultantDoctor}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Reference Doctor:</label>
                  <input
                    type="text"
                    name="referenceDoctor"
                    value={formData.referenceDoctor}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Operator Name:</label>
                <input
                  type="text"
                  name="operatorName"
                  value={formData.operatorName}
                  onChange={handleChange}
                  readOnly
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Medical Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Temperature (°F):</label>
                  <input
                    type="text"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Pulse Rate (bpm):</label>
                  <input
                    type="text"
                    name="pulseRate"
                    value={formData.pulseRate}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Blood Pressure (mmHg):</label>
                  <input
                    type="text"
                    name="bloodPressure"
                    value={formData.bloodPressure}
                    onChange={handleChange}
                    readOnly={isFormReadOnly}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Patient History:</label>
                <textarea
                  name="patientHistory"
                  value={formData.patientHistory}
                  onChange={handleChange}
                  readOnly={isFormReadOnly}
                />
              </div>
              <div className="form-group">
                <label>Review Date:</label>
                <input
                  type="date"
                  name="reviewDate"
                  value={formData.reviewDate}
                  onChange={handleChange}
                  readOnly={isFormReadOnly}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Media Upload</h3>
              <div className="form-group">
                <label>Upload Image/Video (max 10MB):</label>
                <input
                  type="file"
                  name="mediaFile"
                  accept="image/jpeg,image/png,video/mp4,video/webm"
                  onChange={handleFileChange}
                  disabled={isFormReadOnly}
                />
                {mediaPreview && (
                  <div className="media-preview">
                    {(formData.mediaFile && formData.mediaFile.type.startsWith('image/')) || (mediaPreview && mediaPreview.includes('image')) ? (
                      <img src={mediaPreview} alt="Patient media preview" className="preview-image" />
                    ) : (
                      <video src={mediaPreview} controls className="preview-video" />
                    )}
                    {!isFormReadOnly && (
                      <button
                        type="button"
                        className="remove-media-btn"
                        onClick={handleRemoveFile}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="patient-list">
          <h3>Patient Records</h3>
          <ul>
            {patients.map(patient => (
              <li 
                key={patient.id} 
                className={selectedPatientId === patient.id ? 'selected' : ''}
                onClick={() => {
                  setFormData({
                    ...patient,
                    mediaFile: null,
                    mediaUrl: patient.mediaUrl || null,
                  });
                  setMediaPreview(patient.mediaUrl || null);
                  setSelectedPatientId(patient.id);
                  setIsOutpatientNoSearched(true);
                  setIsPatientNameSearched(true);
                  setError(null);
                }}
              >
                {patient.patientName || 'Unnamed Patient'} (Outpatient No: {patient.outpatientNo})
              </li>
            ))}
          </ul>
        </div>

        <div className="action-buttons">
          <button type="button" className="action-btn new" onClick={handleReset} title="New (F5)">
            NEW - F5
          </button>
          <button
            type="button"
            className="action-btn edit"
            onClick={() => selectedPatientId ? handleEdit(patients.find(p => p.id === selectedPatientId)) : patients.length > 0 && handleEdit(patients[0])}
            title="Edit (F6)"
          >
            EDIT - F6
          </button>
          <button type="button" className="action-btn delete" onClick={() => selectedPatientId && handleDelete(selectedPatientId)} title="Delete (F7)">
            DELETE - F7
          </button>
          <button type="button" className="action-btn review" title="Review">
            REVIEW
          </button>
          <button type="button" className="action-btn first" onClick={() => patients.length > 0 && handleEdit(patients[0])} title="First (Home)">
            FIRST - Hm
          </button>
          <button
            type="button"
            className="action-btn next"
            onClick={() => {
              if (selectedPatientId) {
                const currentIndex = patients.findIndex(p => p.id === selectedPatientId);
                if (currentIndex !== -1 && currentIndex < patients.length - 1) {
                  handleEdit(patients[currentIndex + 1]);
                }
              } else if (patients.length > 0) {
                handleEdit(patients[0]);
              }
            }}
            title="Next (PgDn)"
          >
            NEXT - PgDn
          </button>
          <button
            type="button"
            className="action-btn prev"
            onClick={() => {
              if (selectedPatientId) {
                const currentIndex = patients.findIndex(p => p.id === selectedPatientId);
                if (currentIndex > 0) {
                  handleEdit(patients[currentIndex - 1]);
                }
              } else if (patients.length > 0) {
                handleEdit(patients[patients.length - 1]);
              }
            }}
            title="Prev (PgUp)"
          >
            PREV - PgUp
          </button>
          <button type="button" className="action-btn last" onClick={() => patients.length > 0 && handleEdit(patients[patients.length - 1])} title="Last (End)">
            LAST - END
          </button>
          <button type="button" className="action-btn ok" onClick={handleSubmit} title="OK (F8)">
            OK - F8
          </button>
          <button type="button" className="action-btn cancel" onClick={handleReset} title="Cancel (F9)">
            CANCEL - F9
          </button>
          <button 
            type="button" 
            className="action-btn quit" 
            onClick={() => {
              if (window.confirm('Quit and go to dashboard?')) {
                navigate('/dashboard');
              }
            }} 
            title="Quit (F12)"
          >
            QUIT - F12
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutPatientDetails;