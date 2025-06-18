import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegistrationForm.css';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dckdkpq7d/auto/upload';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

const INITIAL_FORM_DATA = {
  outpatientNo: '',
  regNo: '',
  admitDate: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
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
  mediaPublicId: null,
  mediaType: null, // 'image' or 'video'
};

const NewRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('new'); // 'new', 'edit', 'view'
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showPatientList, setShowPatientList] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const generateRegistrationNumbers = useCallback(async () => {
    try {
      const outpatientQ = query(collection(db, 'patients'), orderBy('outpatientNo', 'desc'), limit(1));
      const regNoQ = query(collection(db, 'patients'), orderBy('regNo', 'desc'), limit(1));
      const [outpatientSnapshot, regNoSnapshot] = await Promise.all([getDocs(outpatientQ), getDocs(regNoQ)]);
      let highestOutpatientNo = 0;
      if (!outpatientSnapshot.empty) {
        const docData = outpatientSnapshot.docs[0].data();
        if (docData.outpatientNo && String(docData.outpatientNo).match(/^\d+$/)) {
          highestOutpatientNo = parseInt(docData.outpatientNo, 10);
        }
      }
      let highestRegNo = 0;
      if (!regNoSnapshot.empty) {
        const docData = regNoSnapshot.docs[0].data();
        if (docData.regNo && String(docData.regNo).match(/^REG\d+$/)) {
          highestRegNo = parseInt(docData.regNo.replace('REG', ''), 10);
        }
      }
      const newOutpatientNo = (highestOutpatientNo + 1).toString().padStart(6, '0');
      const newRegNo = `REG${(highestRegNo + 1).toString().padStart(6, '0')}`;
      return { newOutpatientNo, newRegNo };
    } catch (err) {
      console.error('Error generating numbers:', err);
      toast.error('Failed to generate registration numbers.');
      return { newOutpatientNo: '000001', newRegNo: 'REG000001' };
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    try {
      const q = query(collection(db, 'patients'), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...INITIAL_FORM_DATA,
          ...docData,
          mediaFile: null,
          mediaType: docData.mediaType || 
                   (docData.mediaUrl ? 
                     (docData.mediaUrl.match(/\.(mp4|mov)$/i) ? 'video' : 'image') : null),
          createdAt: docData.createdAt ? new Date(docData.createdAt) : new Date(0),
        };
      });
      setPatients(data);
      setFilteredPatients(data);
      if (mode === 'view' && data.length > 0) {
        setFormData({ 
          ...data[data.length - 1], 
          mediaFile: null,
          mediaType: data[data.length - 1].mediaType || 
                   (data[data.length - 1].mediaUrl ? 
                     (data[data.length - 1].mediaUrl.match(/\.(mp4|mov)$/i) ? 'video' : 'image') : null)
        });
        setCurrentIndex(data.length - 1);
        setMediaPreview(data[data.length - 1].mediaUrl || null);
      } else if (data.length === 0) {
        handleReset();
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error('Failed to fetch patient data.');
      setError('Failed to fetch patient data: ' + err.message);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [mode]);

  const handleReset = useCallback(async () => {
    const { newOutpatientNo, newRegNo } = await generateRegistrationNumbers();
    setFormData({
      ...INITIAL_FORM_DATA,
      outpatientNo: newOutpatientNo,
      regNo: newRegNo,
      admitDate: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      operatorName: auth.currentUser?.displayName || localStorage.getItem('username') || '',
    });
    setMediaPreview(null);
    setError(null);
    setMode('new');
    setCurrentIndex(-1);
  }, [generateRegistrationNumbers]);

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchPatients();
      if (patients.length === 0) {
        await handleReset();
      }
    };
    fetchInitialData();
  }, [fetchPatients, handleReset, patients.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      switch (e.key) {
        case 'F5':
          e.preventDefault();
          handleNewEntry();
          break;
        case 'F6':
          e.preventDefault();
          handleEdit();
          break;
        case 'F7':
          e.preventDefault();
          handleRemove();
          break;
        case 'Home':
          e.preventDefault();
          navigateTo(0, 'Showing first patient.');
          break;
        case 'PageUp':
          e.preventDefault();
          navigateTo(currentIndex - 1, 'Showing previous patient.');
          break;
        case 'PageDown':
          e.preventDefault();
          navigateTo(currentIndex + 1, 'Showing next patient.');
          break;
        case 'End':
          e.preventDefault();
          handleLastPatient();
          break;
        case 'F8':
          e.preventDefault();
          handleOk();
          break;
        case 'F9':
          e.preventDefault();
          handleCancel();
          break;
        case 'F12':
          e.preventDefault();
          handleQuit();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, patients, currentIndex]);

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age.toString();
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'dob') {
      const calculatedAge = calculateAge(value);
      setFormData(prev => ({ ...prev, dob: value, age: calculatedAge }));
    } else if (files) {
      const file = files[0];
      if (file) {
        const validTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        if (!validTypes.includes(file.type)) {
          toast.error('Only JPG, PNG, MP4 or MOV files allowed.', { duration: 3000 });
          setError('Please upload an image (JPEG/PNG) or video (MP4/MOV) file.');
          return;
        }
        
        if (file.size > maxSize) {
          toast.error(`File size exceeds ${maxSize/1024/1024}MB limit.`, { duration: 3000 });
          setError(`File size exceeds ${maxSize/1024/1024}MB limit.`);
          return;
        }
        
        setFormData(prev => ({ 
          ...prev, 
          mediaFile: file,
          mediaType: file.type.startsWith('video') ? 'video' : 'image'
        }));
        setMediaPreview(URL.createObjectURL(file));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, mediaFile: null, mediaUrl: null, mediaPublicId: null, mediaType: null }));
    setMediaPreview(null);
    const fileInput = document.querySelector('input[name="mediaFile"]');
    if (fileInput) fileInput.value = '';
  };

  const uploadToCloudinary = async (file) => {
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formDataToSend.append('folder', `patient-media/${formData.outpatientNo}`);
    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formDataToSend,
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return { secure_url: result.secure_url, public_id: result.public_id };
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      toast.error('File upload failed.');
      setError('File upload failed: ' + err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.patientName || !formData.outpatientNo || !formData.regNo || !formData.admitDate || !formData.time || !formData.dob || !formData.consultantDoctor) {
      toast.error('Please fill all required fields.', { duration: 3000 });
      setError('Please fill all required fields.');
      return;
    }
    try {
      let mediaUrl = formData.mediaUrl;
      let mediaPublicId = formData.mediaPublicId;
      let mediaType = formData.mediaType;
      if (formData.mediaFile) {
        const uploadResult = await uploadToCloudinary(formData.mediaFile);
        if (!uploadResult) return;
        mediaUrl = uploadResult.secure_url;
        mediaPublicId = uploadResult.public_id;
        mediaType = formData.mediaFile.type.startsWith('video') ? 'video' : 'image';
      }
      const patientData = {
        ...formData,
        mediaFile: null,
        mediaUrl,
        mediaPublicId,
        mediaType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        age: parseInt(formData.age) || null,
        weight: parseFloat(formData.weight) || null,
      };
      if (mode === 'edit' && currentIndex >= 0) {
        const patientRef = doc(db, 'patients', patients[currentIndex].id);
        await updateDoc(patientRef, patientData);
        setPatients(prev => prev.map((p, i) => (i === currentIndex ? { id: p.id, ...patientData } : p)));
        setFilteredPatients(prev => prev.map((p, i) => (i === currentIndex ? { id: p.id, ...patientData } : p)));
        toast.success('Patient information updated successfully!', { duration: 3000 });
        await fetchPatients();
      } else {
        const docRef = await addDoc(collection(db, 'patients'), patientData);
        setPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        setFilteredPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        toast.success('Patient registration submitted successfully!', { duration: 3000 });
      }
      setMode('view');
      setCurrentIndex(patients.length);
      setFormData({ ...patientData, mediaFile: null });
      setMediaPreview(mediaUrl || null);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to submit form: ' + err.message, { duration: 3000 });
      setError('Failed to submit form: ' + err.message);
    }
  };

  const handleNewEntry = async () => {
    if (mode === 'new' || mode === 'edit') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    await handleReset();
    toast.success('New patient form initialized.', { duration: 2000 });
  };

  const handleEdit = async () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    await fetchPatients();
    setShowPatientList(true);
    setActionType('edit');
  };

  const handleRemove = async () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    await fetchPatients();
    setShowPatientList(true);
    setActionType('remove');
  };

  const handleSelectPatient = async (patient) => {
    setShowPatientList(false);
    if (actionType === 'edit') {
      const updatedFormData = {
        ...patient,
        mediaFile: null,
        age: patient.age ? String(patient.age) : calculateAge(patient.dob),
      };
      setFormData(updatedFormData);
      setMediaPreview(patient.mediaUrl || null);
      const index = patients.findIndex(p => p.id === patient.id);
      setCurrentIndex(index);
      setMode('edit');
      toast.success(`Patient "${patient.patientName}" loaded for editing.`, { duration: 2000 });
    } else if (actionType === 'remove') {
      setPatientToDelete(patient);
      setShowConfirmDeleteModal(true);
    }
    setActionType(null);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    try {
      if (patientToDelete.mediaPublicId) {
        console.warn('Cloudinary deletion requires backend. Public ID:', patientToDelete.mediaPublicId);
      }
      await deleteDoc(doc(db, 'patients', patientToDelete.id));
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      setFilteredPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      toast.success('Patient deleted successfully!', { duration: 3000 });
      if (patients.length > 1) {
        const newIndex = currentIndex >= patients.length - 1 ? patients.length - 2 : currentIndex;
        navigateTo(newIndex, 'Showing next available patient.');
      } else {
        await handleReset();
      }
    } catch (err) {
      toast.error('Failed to delete patient: ' + err.message, { duration: 3000 });
      setError('Failed to delete patient: ' + err.message);
    } finally {
      setPatientToDelete(null);
      setShowConfirmDeleteModal(false);
    }
  };

  const handleCancelDelete = () => {
    toast.info('Deletion cancelled.', { duration: 2000 });
    setPatientToDelete(null);
    setShowConfirmDeleteModal(false);
  };

  const navigateTo = (index, message) => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (index >= 0 && index < patients.length) {
      setFormData({ ...patients[index], mediaFile: null });
      setMediaPreview(patients[index].mediaUrl || null);
      setCurrentIndex(index);
      setMode('view');
      if (message) toast.info(message, { duration: 2000 });
    }
  };

  const handleLastPatient = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (patients.length === 0) {
      toast.info('No patients to display.', { duration: 2000 });
      return;
    }
    const lastIndex = patients.length - 1;
    setFormData({ ...patients[lastIndex], mediaFile: null });
    setMediaPreview(patients[lastIndex].mediaUrl || null);
    setCurrentIndex(lastIndex);
    setMode('view');
    toast.success(`Showing most recent patient: ${patients[lastIndex].patientName}`, { duration: 2000 });
  };

  const handleOk = () => {
    if (mode === 'new' || mode === 'edit') {
      document.querySelector('form').requestSubmit();
    } else {
      fetchPatients();
    }
  };

  const handleCancel = async () => {
    setMode('view');
    if (patients.length > 0) {
      const lastIndex = patients.length - 1;
      setFormData({ ...patients[lastIndex], mediaFile: null });
      setMediaPreview(patients[lastIndex].mediaUrl || null);
      setCurrentIndex(lastIndex);
      toast.info('Operation cancelled. Showing most recent patient.', { duration: 2000 });
    } else {
      await handleReset();
      setMode('view');
      toast.info('Operation cancelled. No patients to display.', { duration: 2000 });
    }
  };

  const handleQuit = () => {
    if (mode === 'new' || mode === 'edit') {
      toast.error('Please save or cancel current operation before quitting.', { duration: 2000 });
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="patient-details-page">
      <Toaster
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            border: '1px solid #fff',
            borderRadius: '8px',
            padding: '10px 20px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
          },
          success: { style: { borderLeft: '4px solid #28a745' } },
          error: { style: { borderLeft: '4px solid #dc3545' } },
          info: { style: { borderLeft: '4px solid #17a2b8' } },
        }}
      />
      <div className="patient-details-container">
        <div className="form-section">
          <form className="patient-form" onSubmit={handleSubmit}>
            <div className="form-row five-details-row">
              <div className="form-group">
                <label htmlFor="outpatientNo">Outpatient No:</label>
                <input
                  type="text"
                  id="outpatientNo"
                  name="outpatientNo"
                  value={formData.outpatientNo}
                  onChange={handleChange}
                  readOnly
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="regNo">Registration No:</label>
                <input
                  type="text"
                  id="regNo"
                  name="regNo"
                  value={formData.regNo}
                  onChange={handleChange}
                  readOnly
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="admitDate">Admit Date:</label>
                <input
                  type="date"
                  id="admitDate"
                  name="admitDate"
                  value={formData.admitDate}
                  onChange={handleChange}
                  readOnly={mode === 'view'}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="time">Time:</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  readOnly={mode === 'view'}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="patientName">Full Name:</label>
                <input
                  type="text"
                  id="patientName"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  readOnly={mode === 'view'}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="motherName">Mother's Name:</label>
              <input
                type="text"
                id="motherName"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                readOnly={mode === 'view'}
              />
              <label htmlFor="fatherName">Father's Name:</label>
              <input
                type="text"
                id="fatherName"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                readOnly={mode === 'view'}
              />
              <label htmlFor="address">Address:</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                readOnly={mode === 'view'}
                rows="2"
              />
            </div>
            <div className="form-row">
              <label htmlFor="gender">Gender:</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={mode === 'view'}
                required
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="maritalStatus">Marital Status:</label>
              <select
                id="maritalStatus"
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                disabled={mode === 'view'}
              >
                <option value="unmarried">Unmarried</option>
                <option value="married">Married</option>
              </select>
              {formData.maritalStatus === 'married' && (
                <>
                  <label htmlFor="spouseName">
                    {formData.gender === 'female' ? 'Husband Name' : formData.gender === 'male' ? 'Wife Name' : 'Spouse Name'}
                  </label>
                  <input
                    type="text"
                    id="spouseName"
                    name="spouseName"
                    value={formData.spouseName}
                    onChange={handleChange}
                    readOnly={mode === 'view'}
                  />
                </>
              )}
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                readOnly={mode === 'view'}
              />
            </div>
            <div className="form-row">
              <label htmlFor="dob">Date of Birth:</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                readOnly={mode === 'view'}
                required
              />
              <label htmlFor="age">Age:</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                readOnly
              />
              <label htmlFor="weight">Weight (kg):</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                readOnly={mode === 'view'}
              />
              <label htmlFor="bloodGroup">Blood Group:</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={mode === 'view'}
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
            <div className="form-row">
              <label htmlFor="consultantDoctor">Consultant Doctor:</label>
              <input
                type="text"
                id="consultantDoctor"
                name="consultantDoctor"
                value={formData.consultantDoctor}
                onChange={handleChange}
                readOnly={mode === 'view'}
                required
              />
              <label htmlFor="referenceDoctor">Reference Doctor:</label>
              <input
                type="text"
                id="referenceDoctor"
                name="referenceDoctor"
                value={formData.referenceDoctor}
                onChange={handleChange}
                readOnly={mode === 'view'}
              />
              <label htmlFor="operatorName">Operator Name:</label>
              <input
                type="text"
                id="operatorName"
                name="operatorName"
                value={formData.operatorName}
                readOnly
              />
            </div>
            <div className="form-row">
              <label htmlFor="mediaFile">Upload Image/Video:</label>
              <input
                type="file"
                id="mediaFile"
                name="mediaFile"
                accept="image/jpeg,image/png,video/mp4,video/quicktime"
                onChange={handleChange}
                disabled={mode === 'view'}
              />
              {(mediaPreview || formData.mediaUrl) && (
                <div className="media-preview">
                  {formData.mediaType === 'video' || (formData.mediaUrl && formData.mediaUrl.match(/\.(mp4|mov)$/i)) ? (
                    <video controls className="preview-media">
                      <source src={mediaPreview || formData.mediaUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={mediaPreview || formData.mediaUrl}
                      alt="Preview"
                      className="preview-media"
                    />
                  )}
                  {(mode === 'new' || mode === 'edit') && (
                    <button
                      type="button"
                      className="clear-file-btn"
                      onClick={handleRemoveFile}
                    >
                      Clear File
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="reset-btn"
                onClick={handleCancel}
                disabled={mode === 'view'}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
        <div className="sidebar-buttons">
          <button
            onClick={handleNewEntry}
            disabled={mode === 'new' || mode === 'edit'}
            title="New (F5)"
          >
            NEW - F5
          </button>
          <button
            onClick={handleEdit}
            disabled={mode !== 'view' || patients.length === 0}
            title="Edit (F6)"
          >
            EDIT - F6
          </button>
          <button
            onClick={handleRemove}
            disabled={mode !== 'view' || patients.length === 0}
            title="Delete (F7)"
          >
            REMOVE - F7
          </button>
          <button
            onClick={() => navigateTo(0, 'Showing first patient.')}
            disabled={mode !== 'view' || patients.length === 0}
            title="First (Home)"
          >
            FIRST - Hm
          </button>
          <button
            onClick={() => navigateTo(currentIndex - 1, 'Showing previous patient.')}
            disabled={mode !== 'view' || currentIndex <= 0 || patients.length === 0}
            title="Prev (PageUp)"
          >
            PREV - PgUp
          </button>
          <button
            onClick={() => navigateTo(currentIndex + 1, 'Showing next patient.')}
            disabled={mode !== 'view' || currentIndex >= patients.length - 1 || patients.length === 0}
            title="Next (PageDown)"
          >
            NEXT - PgDn
          </button>
          <button
            onClick={handleLastPatient}
            disabled={mode !== 'view' || patients.length === 0}
            title="Last (End)"
          >
            LAST - END
          </button>
          <button
            onClick={handleOk}
            title="Ok (F8)"
          >
            OK - F8
          </button>
          <button
            onClick={handleCancel}
            disabled={mode === 'view'}
            title="Cancel (F9)"
          >
            CANCEL - F9
          </button>
          <button
            onClick={handleQuit}
            disabled={mode !== 'view'}
            title="Quit (F12)"
          >
            QUIT - F12
          </button>
        </div>
      </div>
      {showPatientList && (
        <div className="patient-list-section">
          <h3 className="section-title">Select Patient to {actionType === 'edit' ? 'Edit' : 'Remove'}</h3>
          <button
            className="close-section-btn"
            onClick={() => { setShowPatientList(false); setActionType(null); }}
          >
            ×
          </button>
          <input
            type="text"
            className="search-patient"
            placeholder="Search patients by name, ID, or date..."
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              const filtered = patients.filter(patient =>
                patient.patientName.toLowerCase().includes(searchTerm) ||
                patient.outpatientNo.toLowerCase().includes(searchTerm) ||
                patient.regNo.toLowerCase().includes(searchTerm) ||
                (patient.dob && patient.dob.toLowerCase().includes(searchTerm)) ||
                (patient.address && patient.address.toLowerCase().includes(searchTerm))
              );
              setFilteredPatients(filtered);
            }}
          />
          <div className="patient-list-container">
            {isLoadingPatients ? (
              <div className="loading-message">Loading patients...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="no-results">
                {patients.length === 0 ? 'No patients registered yet' : 'No matching patients found'}
              </div>
            ) : (
              filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="patient-item"
                >
                  <strong>{patient.patientName}</strong>
                  <div className="patient-details">
                    <span>OP No: {patient.outpatientNo}</span>
                    <span>Reg No: {patient.regNo}</span>
                    {patient.dob && <span>DOB: {patient.dob}</span>}
                    {patient.gender && <span>Gender: {patient.gender}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showConfirmDeleteModal && patientToDelete && (
        <div className="confirm-delete-modal">
          <div className="confirm-delete-content">
            <h3>Confirm Deletion</h3>
            <p>
              Are you sure you want to delete patient "<strong>{patientToDelete.patientName}</strong>" (OP No: {patientToDelete.outpatientNo})?
            </p>
            <div className="confirm-delete-buttons">
              <button onClick={handleConfirmDelete}>Yes, Delete</button>
              <button onClick={handleCancelDelete}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewRegistration;