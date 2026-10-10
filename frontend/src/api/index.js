import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || (API_BASE_URL.replace(/^http/, 'ws') + '/ws/queue');

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const generateToken = (uhid, doctorId) => api.post('/token/generate', { uhid, doctor_id: doctorId });
export const getQueue = () => api.get('/token/queue');
export const callNextToken = () => api.post('/token/next');
export const completeToken = (tokenId) => api.post(`/token/complete/${tokenId}`);
export const getCounter = () => api.get('/token/counter');
export const getDoctors = () => api.get('/doctors/');
export const createPatient = (data) => api.post('/patients/', data);
export const getPatient = (uhid) => api.get(`/patients/${uhid}`);
export const getPatients = (params) => api.get('/patients/', { params });
export const uploadVitalsImage = (file, tokenId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (tokenId) formData.append('token_id', tokenId);
  return api.post('/vitals/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const saveVitals = (data) => api.post('/vitals/save', data);
export const getApiPatients = (params) => api.get('/api/patients', { params });
export const getApiStats = () => api.get('/api/stats');
export const getPatientVitals = (uhid) => api.get(`/api/patients/${uhid}/vitals`);
export const getTodayTokens = () => api.get('/api/tokens/today');
export const transferDoctorPatients = (data) => api.post('/token/transfer', data);
export const autoBalanceDoctorPatients = (data) => api.post('/token/auto-balance', data);
export const reassignToken = (tokenId, doctorId) => api.post(`/token/${tokenId}/reassign`, { doctor_id: doctorId });
export const getDoctorWorkload = () => api.get('/doctors/workload');

export default api;
