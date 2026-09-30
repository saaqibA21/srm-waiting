import React, { useState, useEffect } from 'react';
import { getPatient, createPatient, getDoctors, generateToken, getTodayTokens } from '../api';
import { Search, UserPlus, Ticket, Clock, User, Stethoscope, CheckCircle2, ChevronRight, X } from 'lucide-react';

const InputField = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <input
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800
        outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white
        transition-all placeholder:text-gray-400"
      {...props}
    />
  </div>
);

function TokenDesk() {
  const [uhid, setUhid]                   = useState('');
  const [patient, setPatient]             = useState(null);
  const [doctors, setDoctors]             = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [recentTokens, setRecentTokens]   = useState([]);
  const [regData, setRegData]             = useState({ name:'', age:'', gender:'M', phone:'' });
  const [showReg, setShowReg]             = useState(false);

  useEffect(() => {
    getDoctors().then(r => setDoctors(r.data)).catch(console.error);
    fetchRecent();
  }, []);

  const fetchRecent = () => {
    getTodayTokens().then(r => setRecentTokens((r.data || []).slice(0, 10))).catch(console.error);
  };

  const handleUhidChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setUhid(val);
    if (val.length >= 6) {
      try {
        const r = await getPatient(val);
        setPatient(r.data); setShowReg(false); setError('');
      } catch {
        setPatient(null); setShowReg(true);
      }
    } else { setPatient(null); setShowReg(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await createPatient({ uhid, ...regData, age: parseInt(regData.age) });
      setPatient(r.data); setShowReg(false); setError('');
    } catch { setError('Failed to register patient'); }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!patient || !selectedDoctor) return;
    setLoading(true);
    try {
      const r = await generateToken(patient.uhid, parseInt(selectedDoctor));
      setGeneratedToken(r.data); fetchRecent(); setError('');
      setUhid(''); setPatient(null); setSelectedDoctor(''); setShowReg(false);
    } catch { setError('Failed to generate token. Please try again.'); }
    setLoading(false);
  };

  const selectedDoc = doctors.find(d => d.id === parseInt(selectedDoctor));

  return (
    <div className="max-w-5xl mx-auto space-y-6 slide-in">

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Form ── */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Ticket size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Generate Token</h2>
                <p className="text-xs text-gray-400">Enter UHID to find or register patient</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <X size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* UHID */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Patient UHID
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800
                      outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white
                      transition-all placeholder:text-gray-400 font-mono uppercase"
                    value={uhid}
                    onChange={handleUhidChange}
                    placeholder="e.g. SRM20240156"
                  />
                </div>
              </div>

              {/* Patient Found */}
              {patient && (
                <div className="flex items-center space-x-4 bg-gradient-to-r from-emerald-50 to-teal-50
                  border border-emerald-200 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500
                    flex items-center justify-center shadow-sm flex-shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-emerald-800">{patient.name}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {patient.age} yrs &bull; {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'} &bull; {patient.phone}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                </div>
              )}

              {/* New Registration */}
              {showReg && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                  <div className="flex items-center space-x-2 mb-4">
                    <UserPlus size={16} className="text-orange-600" />
                    <h3 className="font-bold text-orange-800 text-sm">Register New Patient</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField placeholder="Full Name" value={regData.name}
                      onChange={e => setRegData({...regData, name: e.target.value})} />
                    <InputField placeholder="Age" type="number" value={regData.age}
                      onChange={e => setRegData({...regData, age: e.target.value})} />
                    <select className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
                      value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                    <InputField placeholder="Phone" value={regData.phone}
                      onChange={e => setRegData({...regData, phone: e.target.value})} />
                  </div>
                  <button onClick={handleRegister} disabled={loading}
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-sm
                      transition-all active:scale-95 disabled:opacity-60"
                    style={{background:'linear-gradient(135deg,#f97316,#ea580c)'}}>
                    {loading ? 'Registering...' : 'Register & Continue'}
                  </button>
                </div>
              )}

              {/* Doctor Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Assign Doctor
                </label>
                <div className="relative">
                  <Stethoscope size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800
                      outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white
                      transition-all appearance-none"
                    value={selectedDoctor}
                    onChange={e => setSelectedDoctor(e.target.value)}>
                    <option value="">Select a Doctor...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.department}
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" />
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!patient || !selectedDoctor || loading}
                className="w-full py-4 rounded-xl font-bold text-white text-sm shadow-lg
                  transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background: (!patient || !selectedDoctor || loading)
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                {loading ? 'Generating...' : '🎫 Generate Token'}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Token Card ── */}
        <div className="lg:col-span-2 space-y-5">
          {generatedToken ? (
            <div className="rounded-2xl overflow-hidden shadow-xl"
              style={{background:'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)'}}>
              <div className="absolute inset-0 opacity-10 rounded-2xl"
                style={{backgroundImage:'radial-gradient(circle at 60% 10%,#a5b4fc,transparent 60%)'}} />
              <div className="p-8 text-center relative">
                <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-4">Token Issued</p>
                <div className="text-8xl font-black text-white token-glow tabular-nums leading-none mb-4">
                  {generatedToken.token_number}
                </div>
                <div className="w-16 h-0.5 bg-indigo-500/40 mx-auto mb-4 rounded-full" />
                <p className="text-white font-bold text-xl">{generatedToken.patient_name}</p>
                <p className="text-indigo-300 text-sm mt-1">{generatedToken.doctor_name || selectedDoc?.name}</p>
                <p className="text-indigo-400 text-xs mt-4">
                  Issued at {new Date(generatedToken.issued_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-white/10 px-6 py-3 text-center">
                <p className="text-indigo-200 text-xs">Please wait for your number to be called</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                  <Ticket size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Token will appear here</p>
                <p className="text-gray-400 text-xs">Enter UHID and select a doctor first</p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Clock size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Progress</p>
            </div>
            <div className="flex items-center justify-between text-center">
              {[
                { label: 'Issued', value: recentTokens.length },
                { label: 'Last Token', value: recentTokens[0]?.token_number || '--' },
              ].map(s => (
                <div key={s.label} className="flex-1">
                  <div className="text-2xl font-black text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Tokens Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Clock size={16} className="text-indigo-500" />
          <h3 className="font-bold text-gray-900">Recent Tokens</h3>
          <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-full ml-auto">
            Last 10
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-6 text-left">Token</th>
              <th className="py-3 px-6 text-left">Patient</th>
              <th className="py-3 px-6 text-left">Doctor</th>
              <th className="py-3 px-6 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentTokens.map(t => (
              <tr key={t.id} className="hover:bg-indigo-50/20 transition-colors">
                <td className="py-3.5 px-6">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm
                    flex items-center justify-center">
                    {t.token_number}
                  </span>
                </td>
                <td className="py-3.5 px-6 font-medium text-gray-800">{t.patient_name}</td>
                <td className="py-3.5 px-6 text-gray-500 text-xs">{t.doctor_name}</td>
                <td className="py-3.5 px-6 text-gray-400 text-xs tabular-nums">
                  {new Date(t.issued_at).toLocaleTimeString()}
                </td>
              </tr>
            ))}
            {recentTokens.length === 0 && (
              <tr><td colSpan="4" className="py-8 text-center text-gray-400 text-sm">No tokens yet today</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default TokenDesk;
