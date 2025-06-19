import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './OutPatientDetails.css';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
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
  patientExamination: '',
  mediaFiles: [],
  mediaUrls: [],
  mediaPublicIds: [],
  mediaTypes: [],
};

// Custom debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const OutPatientDetails = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('new');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showPatientList, setShowPatientList] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...INITIAL_FORM_DATA,
        ...doc.data(),
        mediaFiles: [],
        mediaUrls: doc.data().mediaUrls || [],
        mediaPublicIds: doc.data().mediaPublicIds || [],
        mediaTypes: doc.data().mediaTypes || [],
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(0),
      }));
      
      setPatients(data);
      setFilteredPatients(data);
      
      if (mode === 'view' && data.length > 0) {
        setFormData({ ...data[data.length - 1], mediaFiles: [] });
        setMediaPreviews((data[data.length - 1].mediaUrls || []).map(url => ({
          url,
          type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
        })));
        setCurrentIndex(data.length - 1);
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

  const fetchPatientByOutpatientNo = useCallback(async (outpatientNo) => {
    try {
      const q = query(collection(db, 'patients'), where('outpatientNo', '==', outpatientNo));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const patient = snapshot.docs[0].data();
        const patientData = {
          id: snapshot.docs[0].id,
          ...INITIAL_FORM_DATA,
          ...patient,
          mediaFiles: [],
          mediaUrls: patient.mediaUrls || [],
          mediaPublicIds: patient.mediaPublicIds || [],
          mediaTypes: patient.mediaTypes || [],
          createdAt: patient.createdAt ? new Date(patient.createdAt) : new Date(0),
        };
        setFormData(patientData);
        setMediaPreviews((patient.mediaUrls || []).map(url => ({
          url,
          type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
        })));
        setMode('view');
        const index = patients.findIndex(p => p.outpatientNo === outpatientNo);
        setCurrentIndex(index !== -1 ? index : patients.length);
        toast.success(`Patient data loaded for OP No: ${outpatientNo}`);
        return true;
      } else {
        toast.error(`No patient found with OP No: ${outpatientNo}`);
        return false;
      }
    } catch (err) {
      console.error('Error fetching patient by outpatientNo:', err);
      toast.error('Failed to fetch patient data.');
      return false;
    }
  }, [patients]);

  const fetchPatientHistory = useCallback(async (outpatientNo) => {
    setIsLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'patientHistory'),
        where('outpatientNo', '==', outpatientNo)
      );
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt).toISOString() : new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Client-side sorting
      setPatientHistory(historyData);
    } catch (err) {
      console.error('Error fetching patient history:', err);
      toast.error('Failed to fetch patient history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [db, setIsLoadingHistory, setPatientHistory, toast]);

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
    setMediaPreviews([]);
    setError(null);
    setMode('new');
    setCurrentIndex(-1);
  }, [generateRegistrationNumbers]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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
        case 'F10':
          e.preventDefault();
          handleShowHistory();
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
    } else if (name === 'mediaFiles' && files) {
      const validTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];
      const maxSize = 50 * 1024 * 1024; // 50MB per file
      
      const newFiles = Array.from(files).filter(file => {
        if (!validTypes.includes(file.type)) {
          toast.error(`File ${file.name} is not a supported type`, { duration: 3000 });
          return false;
        }
        if (file.size > maxSize) {
          toast.error(`File ${file.name} exceeds size limit (50MB)`, { duration: 3000 });
          return false;
        }
        return true;
      });

      setFormData(prev => ({
        ...prev,
        mediaFiles: [...prev.mediaFiles, ...newFiles],
      }));

      const newPreviews = newFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
        name: file.name,
        isNew: true
      }));
      setMediaPreviews(prev => [...prev, ...newPreviews]);
    } else if (name === 'patientName' && mode === 'edit') {
      toast.error('Patient name cannot be changed for existing patients.', { duration: 3000 });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const debouncedFetchPatient = useCallback(
    debounce(async (outpatientNo) => {
      if (outpatientNo && String(outpatientNo).match(/^\d+$/)) {
        const patientExists = await fetchPatientByOutpatientNo(outpatientNo);
        if (!patientExists && mode === 'new') {
          const { newRegNo } = await generateRegistrationNumbers();
          setFormData(prev => ({
            ...prev,
            outpatientNo,
            regNo: newRegNo,
          }));
        }
      } else if (outpatientNo && !String(outpatientNo).match(/^\d+$/)) {
        toast.error('Outpatient No must be a valid number.');
      }
    }, 500),
    [fetchPatientByOutpatientNo, generateRegistrationNumbers, mode]
  );

  const handleOutpatientNoChange = (e) => {
    const outpatientNo = e.target.value.trim();
    setFormData(prev => ({ ...prev, outpatientNo }));
    debouncedFetchPatient(outpatientNo);
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => {
      const updatedFiles = [...prev.mediaFiles];
      const updatedUrls = [...prev.mediaUrls];
      const updatedPublicIds = [...prev.mediaPublicIds];
      const updatedTypes = [...prev.mediaTypes];
      
      const preview = mediaPreviews[index];
      if (preview.isNew) {
        updatedFiles.splice(index - (prev.mediaUrls.length), 1);
      } else {
        updatedUrls.splice(index, 1);
        updatedPublicIds.splice(index, 1);
        updatedTypes.splice(index, 1);
      }
      
      return {
        ...prev,
        mediaFiles: updatedFiles,
        mediaUrls: updatedUrls,
        mediaPublicIds: updatedPublicIds,
        mediaTypes: updatedTypes
      };
    });

    const preview = mediaPreviews[index];
    if (preview.isNew) {
      URL.revokeObjectURL(preview.url);
    }

    setMediaPreviews(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadToCloudinary = async (files) => {
    const uploadResults = [];
    
    for (const file of files) {
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
        
        uploadResults.push({
          secure_url: result.secure_url,
          public_id: result.public_id,
          type: file.type.startsWith('video') ? 'video' : 'image'
        });
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    return uploadResults;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.patientName || !formData.outpatientNo || !formData.regNo || 
        !formData.admitDate || !formData.time || !formData.dob || !formData.consultantDoctor) {
      toast.error('Please fill all required fields.', { duration: 3000 });
      setError('Please fill all required fields.');
      return;
    }
    
    try {
      let mediaUrls = [...formData.mediaUrls];
      let mediaPublicIds = [...formData.mediaPublicIds];
      let mediaTypes = [...formData.mediaTypes];
      
      if (formData.mediaFiles.length > 0) {
        const uploadResults = await uploadToCloudinary(formData.mediaFiles);
        uploadResults.forEach(result => {
          mediaUrls.push(result.secure_url);
          mediaPublicIds.push(result.public_id);
          mediaTypes.push(result.type);
        });
      }

      const patientData = {
        ...formData,
        mediaFiles: [],
        mediaUrls,
        mediaPublicIds,
        mediaTypes,
        createdAt: mode === 'edit' ? formData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        age: parseInt(formData.age) || null,
        weight: parseFloat(formData.weight) || null,
      };
      
      const historyEntry = {
        outpatientNo: formData.outpatientNo,
        regNo: formData.regNo,
        patientName: formData.patientName,
        patientExamination: formData.patientExamination,
        admitDate: formData.admitDate,
        time: formData.time,
        consultantDoctor: formData.consultantDoctor,
        mediaUrls,
        mediaPublicIds,
        mediaTypes,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'patientHistory'), historyEntry);

      if (mode === 'edit' && currentIndex >= 0) {
        const patientRef = doc(db, 'patients', patients[currentIndex].id);
        await updateDoc(patientRef, patientData);
        setPatients(prev => prev.map((p, i) => (i === currentIndex ? { id: p.id, ...patientData } : p)));
        setFilteredPatients(prev => prev.map((p, i) => (i === currentIndex ? { id: p.id, ...patientData } : p)));
        toast.success('Patient information updated successfully!', { duration: 3000 });
      } else {
        const docRef = await addDoc(collection(db, 'patients'), patientData);
        setPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        setFilteredPatients(prev => [...prev, { id: docRef.id, ...patientData }]);
        toast.success('Patient registration submitted successfully!', { duration: 3000 });
      }
      
      setMode('view');
      setCurrentIndex(patients.length);
      setFormData({ ...patientData, mediaFiles: [] });
      setMediaPreviews(mediaUrls.map(url => ({
        url,
        type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
      })));
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
    if (formData.outpatientNo) {
      const patientExists = await fetchPatientByOutpatientNo(formData.outpatientNo);
      if (patientExists) {
        setFormData(prev => ({
          ...prev,
          patientExamination: '',
          mediaFiles: [],
          mediaUrls: [],
          mediaPublicIds: [],
          mediaTypes: [],
          admitDate: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        }));
        setMediaPreviews([]);
        setMode('new');
        toast.success('Ready to add new examination for existing patient.', { duration: 2000 });
      } else {
        await handleReset();
        toast.success('New patient form initialized.', { duration: 2000 });
      }
    } else {
      await handleReset();
      toast.success('New patient form initialized.', { duration: 2000 });
    }
  };

  const handleEdit = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (currentIndex < 0 || !patients[currentIndex]) {
      toast.info('No patient selected to edit.', { duration: 2000 });
      return;
    }
    setFormData(prev => ({
      ...prev,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    }));
    setMode('edit');
    toast.success('Patient data ready for editing.', { duration: 2000 });
  };

  const handleRemove = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (currentIndex < 0 || !patients[currentIndex]) {
      toast.info('No patient selected to delete.', { duration: 2000 });
      return;
    }
    setPatientToDelete(patients[currentIndex]);
    setShowConfirmDeleteModal(true);
  };

  const handleShowHistory = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (currentIndex < 0 || !patients[currentIndex]) {
      toast.info('No patient selected to view history.', { duration: 2000 });
      return;
    }
    fetchPatientHistory(patients[currentIndex].outpatientNo);
    setShowHistoryModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    try {
      if (patientToDelete.mediaPublicIds && patientToDelete.mediaPublicIds.length > 0) {
        console.warn('Cloudinary deletion requires backend. Public IDs:', patientToDelete.mediaPublicIds);
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
      setFormData({ ...patients[index], mediaFiles: [] });
      setMediaPreviews((patients[index].mediaUrls || []).map(url => ({
        url,
        type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
      })));
      setCurrentIndex(index);
      setMode('view');
      if (message) toast.info(message);
    }
  };

  const handleLastPatient = () => {
    if (mode !== 'view') {
      toast.info('Please save or cancel current operation.', { duration: 2000 });
      return;
    }
    if (patients.length === 0) {
      toast.info('No patients to display.');
      return;
    }
    const lastIndex = patients.length - 1;
    setFormData({ ...patients[lastIndex], mediaFiles: [] });
    setMediaPreviews((patients[lastIndex].mediaUrls || []).map(url => ({
      url,
      type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
    })));
    setCurrentIndex(lastIndex);
    setMode('view');
    toast.success(`Showing most recent patient: ${patients[lastIndex].patientName}`);
  };

  const handleOk = () => {
    if (mode === 'new' || mode === 'edit') {
      document.querySelector('form').requestSubmit();
    } else {
      toast.info('No changes to submit.', { duration: 2000 });
    }
  };

  const handleCancel = async () => {
    if (mode === 'view') {
      toast.info('No operation to cancel.', { duration: 2000 });
      return;
    }
    setMode('view');
    if (patients.length > 0) {
      const lastIndex = patients.length - 1;
      setFormData({ ...patients[lastIndex], mediaFiles: [] });
      setMediaPreviews((patients[lastIndex].mediaUrls || []).map(url => ({
        url,
        type: url.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
      })));
      setCurrentIndex(lastIndex);
      toast.info('Operation cancelled. Showing most recent patient.');
    } else {
      await handleReset();
      setMode('view');
      toast.info('Operation cancelled. No patients to display.');
    }
  };

  const handleQuit = () => {
    if (mode === 'new' || mode === 'edit') {
      toast.error('Please save or cancel current operation before quitting.');
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
          success: { style: { borderBottom: '4px solid #28a745' } },
          error: { style: { borderBottom: '4px solid #dc3545' } },
          info: { style: { borderBottom: '4px solid #17a2b8' } },
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
                  onChange={handleOutpatientNoChange}
                  required
                  readOnly={mode === 'edit'}
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
                  readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                  readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="patientName">Name:</label>
                <input
                  type="text"
                  id="patientName"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  readOnly={mode === 'view' || mode === 'edit' || (mode === 'new' && formData.patientName)}
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
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
              />
              <label htmlFor="fatherName">Father's Name:</label>
              <input
                type="text"
                id="fatherName"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
              />
              <label htmlFor="address">Address:</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                disabled={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                disabled={mode === 'view' || (mode === 'new' && formData.patientName)}
              >
                <option value="unmarried">Unmarried</option>
                <option value="married">Married</option>
              </select>
              {formData.maritalStatus === 'married' && (
                <>
                  <label htmlFor="spouseName">
                    {formData.gender === 'female' ? 'Husband' : formData.gender === 'male' ? 'Wife' : 'Spouse'}
                  </label>
                  <input
                    type="text"
                    id="spouseName"
                    name="spouseName"
                    value={formData.spouseName}
                    onChange={handleChange}
                    readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
              />
              <label htmlFor="bloodGroup">Blood Group:</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                disabled={mode === 'view' || (mode === 'new' && formData.patientName)}
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
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
                required
              />
              <label htmlFor="referenceDoctor">Reference Doctor:</label>
              <input
                type="text"
                id="referenceDoctor"
                name="referenceDoctor"
                value={formData.referenceDoctor}
                onChange={handleChange}
                readOnly={mode === 'view' || (mode === 'new' && formData.patientName)}
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
              <label htmlFor="patientExamination">Patient Examination:</label>
              <textarea
                id="patientExamination"
                name="patientExamination"
                value={formData.patientExamination}
                onChange={handleChange}
                readOnly={mode === 'view'}
                rows="4"
                placeholder="Enter clinical notes or examination details"
              />
            </div>
            <div className="form-row">
              <label htmlFor="mediaFiles">Upload Images/Videos:</label>
              <input
                type="file"
                id="mediaFiles"
                name="mediaFiles"
                accept="image/jpeg,image/png,video/mp4,video/quicktime"
                onChange={handleChange}
                disabled={mode === 'view'}
                multiple
              />
              {(mediaPreviews.length > 0) && (
                <div className="media-previews">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="media-preview-item">
                      {preview.type === 'video' ? (
                        <video controls className="preview-media">
                          <source src={preview.url} type="video/mp4" />
                        </video>
                      ) : (
                        <img
                          src={preview.url}
                          alt={`Preview ${index}`}
                          className="preview-media"
                        />
                      )}
                      <div className="media-info">
                        <span>{preview.name || `File ${index}`}</span>
                        {(mode === 'new' || mode === 'edit') && (
                          <button
                            type="button"
                            className="clear-file-btn"
                            onClick={() => handleRemoveFile(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
            DELETE - F7
          </button>
          <button
            onClick={handleShowHistory}
            disabled={mode !== 'view' || patients.length === 0}
            title="History (F10)"
          >
            HISTORY - F10
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
            disabled={mode === 'view'}
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
      {showHistoryModal && (
        <div className="history-modal">
          <div className="history-content">
            <h3>Examination History for {patients[currentIndex]?.patientName} (OP No: {patients[currentIndex]?.outpatientNo})</h3>
            <button
              className="close-section-btn"
              onClick={() => setShowHistoryModal(false)}
            >
              ×
            </button>
            {isLoadingHistory ? (
              <div className="loading-message">Loading history...</div>
            ) : patientHistory.length === 0 ? (
              <div className="no-results">No examination history found for this patient.</div>
            ) : (
              <div className="history-list">
                {patientHistory.map((entry, index) => (
                  <div key={entry.id} className="history-item">
                    <h4>Entry #{patientHistory.length - index} - {new Date(entry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</h4>
                    <div className="history-details">
                      <p><strong>Patient Examination:</strong> {entry.patientExamination || 'No notes recorded'}</p>
                      <p><strong>Consultant Doctor:</strong> {entry.consultantDoctor || '-'}</p>
                      <p><strong>Admit Date:</strong> {entry.admitDate || '-'}</p>
                      <p><strong>Time:</strong> {entry.time || '-'}</p>
                      {entry.mediaUrls && entry.mediaUrls.length > 0 && (
                        <div className="history-media">
                          <p><strong>Media Files:</strong></p>
                          <div className="media-previews">
                            {entry.mediaUrls.map((url, idx) => (
                              <div key={idx} className="media-preview-item">
                                {entry.mediaTypes[idx] === 'video' || url.match(/\.(mp4|mov)$/i) ? (
                                  <video controls className="preview-media">
                                    <source src={url} type="video/mp4" />
                                  </video>
                                ) : (
                                  <img src={url} alt={`Preview ${idx}`} className="preview-media" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OutPatientDetails;