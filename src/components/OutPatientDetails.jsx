import React, { useState, useEffect } from 'react';
import './OutPatientDetails.css';

const OutPatientDetails = () => {
  const [formData, setFormData] = useState({
    outpatientNo: '',
    regNo: '',
    admitDate: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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
    mediaFile: null
  });

  const [mediaPreview, setMediaPreview] = useState(null);
  const [patients, setPatients] = useState(JSON.parse(localStorage.getItem('patients')) || []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        console.log('Please upload an image (JPEG/PNG) or video (MP4/WebM) file.');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.log('File size exceeds 10MB limit.');
        return;
      }

      setFormData(prev => ({ ...prev, mediaFile: file }));
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, mediaFile: null }));
    setMediaPreview(null);
    const fileInput = document.querySelector('input[name="mediaFile"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedPatients = [...patients, { ...formData, mediaFile: mediaPreview }];
    setPatients(updatedPatients);
    localStorage.setItem('patients', JSON.stringify(updatedPatients));
    console.log('Form submitted:', formData);
    handleReset();
  };

  const handleReset = () => {
    setFormData({
      outpatientNo: '',
      regNo: '',
      admitDate: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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
      mediaFile: null
    });
    setMediaPreview(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case 'F5': 
          handleReset(); 
          break;
        case 'F6': 
          break;
        case 'F7': 
          window.confirm('Delete this record?');
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
          break;
        case 'F9': 
          break;
        case 'F12': 
          window.confirm('Quit without saving?') && window.close();
          break;
        default: 
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="page-content">
      <h1>Out-Patient Details</h1>
      
      <div className="registration-wrapper">
        <div className="registration-container">
          <h2>Outpatient Registration</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Registration Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Outpatient No:</label>
                  <input type="text" name="outpatientNo" value={formData.outpatientNo} onChange={handleChange} required />
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
              <h3>Patient History/Examination</h3>
              <div className="form-group">
                <label>Patient History/Examination:</label>
                <textarea 
                  name="patientHistory" 
                  value={formData.patientHistory} 
                  onChange={handleChange} 
                  rows="4" 
                  placeholder="Enter patient history or examination details"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Temperature (°C):</label>
                  <input 
                    type="number" 
                    name="temperature" 
                    value={formData.temperature} 
                    onChange={handleChange} 
                    step="0.1" 
                    placeholder="e.g., 36.5"
                  />
                </div>
                <div className="form-group">
                  <label>Pulse Rate (bpm):</label>
                  <input 
                    type="number" 
                    name="pulseRate" 
                    value={formData.pulseRate} 
                    onChange={handleChange} 
                    placeholder="e.g., 80"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Blood Pressure (mmHg):</label>
                  <input 
                    type="text" 
                    name="bloodPressure" 
                    value={formData.bloodPressure} 
                    onChange={handleChange} 
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div className="form-group">
                  <label>Review Date:</label>
                  <input 
                    type="date" 
                    name="reviewDate" 
                    value={formData.reviewDate} 
                    onChange={handleChange} 
                  />
                </div>
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
                />
                {mediaPreview && (
                  <div className="media-preview">
                    {formData.mediaFile.type.startsWith('image/') ? (
                      <img src={mediaPreview} alt="Patient media preview" className="preview-image" />
                    ) : (
                      <video src={mediaPreview} controls className="preview-video" />
                    )}
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
          </form>
        </div>

        <div className="action-buttons">
          <button type="button" className="action-btn new" onClick={handleReset} title="New (F5)">
            NEW - F5
          </button>
          <button type="button" className="action-btn edit" onClick={() => {}} title="Edit (F6)">
            EDIT - F6
          </button>
          <button type="button" className="action-btn delete" onClick={() => window.confirm('Delete?')} title="Delete (F7)">
            REMOVE - F7
          </button>
          <button type="button" className="action-btn review" onClick={() => {}} title="Review">
            REVIEW
          </button>
          <button type="button" className="action-btn first" onClick={() => {}} title="First (Home)">
            FIRST - Hm
          </button>
          <button type="button" className="action-btn next" onClick={() => {}} title="Next (PgDn)">
            NEXT - PgDn
          </button>
          <button type="button" className="action-btn prev" onClick={() => {}} title="Prev (PgUp)">
            PREV - PgUp
          </button>
          <button type="button" className="action-btn last" onClick={() => {}} title="Last (End)">
            LAST - END
          </button>
          <button type="button" className="action-btn ok" onClick={() => {}} title="OK (F8)">
            OK - F8
          </button>
          <button type="button" className="action-btn cancel" onClick={() => {}} title="Cancel (F9)">
            CANCEL - F9
          </button>
          <button type="button" className="action-btn quit" onClick={() => window.confirm('Quit form?') && window.close()} title="Quit (F12)">
            QUIT - F12
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutPatientDetails;