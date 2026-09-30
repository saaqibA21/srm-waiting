import React, { useState } from 'react';
import { getApiPatients, getPatientVitals } from '../api';
import {
  Search, User, Heart, Activity, Thermometer, Wind,
  Scale, Ruler, MessageSquare, ChevronRight, Clock,
  FileText, TrendingUp, Calendar
} from 'lucide-react';

const VitalChip = ({ icon: Icon, label, value, color }) => (
  value ? (
    <div className={`flex items-center space-x-2 bg-${color}-50 border border-${color}-100 rounded-xl px-3 py-2`}>
      <div className={`w-6 h-6 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
        <Icon size={12} className={`text-${color}-600`} />
      </div>
      <div>
        <p className={`text-xs text-${color}-500 font-medium leading-none`}>{label}</p>
        <p className={`text-sm font-bold text-${color}-800 leading-tight`}>{value}</p>
      </div>
    </div>
  ) : null
);

function PatientHistory() {
  const [query, setQuery]                   = useState('');
  const [patients, setPatients]             = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitalsHistory, setVitalsHistory]   = useState([]);
  const [activeTab, setActiveTab]           = useState('vitals');
  const [searching, setSearching]           = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault(); setSearching(true);
    try {
      const res = await getApiPatients({ search: query });
      setPatients(res.data || []);
    } catch { console.error('search error'); }
    setSearching(false);
  };

  const selectPatient = async (p) => {
    setSelectedPatient(p); setVitalsHistory([]);
    try {
      const res = await getPatientVitals(p.uhid);
      setVitalsHistory(res.data || []);
    } catch { console.error('vitals fetch error'); }
  };

  return (
    <div className="space-y-5 slide-in">

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <form onSubmit={handleSearch} className="flex space-x-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search by UHID or Patient Name..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm
                outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white transition-all"
              value={query} onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={searching}
            className="px-6 py-3 rounded-xl font-bold text-white text-sm shadow-sm transition-all active:scale-95 disabled:opacity-70"
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Patient List ── */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center space-x-2">
            <User size={14} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700">Results</h3>
            {patients.length > 0 && (
              <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                {patients.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-[520px] overflow-auto">
            {patients.map(p => (
              <div key={p.uhid} onClick={() => selectPatient(p)}
                className={`px-4 py-3.5 cursor-pointer transition-all group
                  ${selectedPatient?.uhid === p.uhid
                    ? 'bg-indigo-50 border-l-2 border-indigo-500'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className={`font-semibold text-sm truncate ${selectedPatient?.uhid === p.uhid ? 'text-indigo-900' : 'text-gray-800'}`}>
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{p.uhid}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.phone}</p>
                  </div>
                  <ChevronRight size={14} className={`flex-shrink-0 ml-2 transition-opacity ${selectedPatient?.uhid === p.uhid ? 'text-indigo-500 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Search for a patient</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        <div className="lg:col-span-3 space-y-5">
          {selectedPatient ? (
            <>
              {/* Profile Card */}
              <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="px-6 py-4 flex items-center space-x-4"
                  style={{background:'linear-gradient(135deg,#1e1b4b,#312e81)'}}>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <User size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">{selectedPatient.name}</h2>
                    <p className="text-indigo-300 text-sm">{selectedPatient.uhid} &bull; {selectedPatient.age} yrs &bull; {selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-indigo-300 text-xs">Phone</p>
                    <p className="text-white font-semibold text-sm">{selectedPatient.phone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* API Integration Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center space-x-3">
                <TrendingUp size={14} className="text-indigo-500 flex-shrink-0" />
                <p className="text-xs text-indigo-700 font-medium">
                  Hospital GET API: <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-800">
                    GET /api/patients/{selectedPatient.uhid}/vitals
                  </code>
                </p>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[
                    { key: 'vitals', label: 'Vitals History',  icon: Heart },
                    { key: 'visits', label: 'Visit History',   icon: Calendar },
                  ].map(tab => (
                    <button key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-semibold
                        transition-colors border-b-2 ${activeTab === tab.key
                          ? 'text-indigo-600 border-indigo-500 bg-indigo-50/50'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}`}>
                      <tab.icon size={15} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Vitals History */}
                {activeTab === 'vitals' && (
                  <div className="p-5 space-y-4">
                    {vitalsHistory.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">
                        <Heart size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No vitals recorded yet</p>
                      </div>
                    ) : (
                      vitalsHistory.map(v => (
                        <div key={v.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Clock size={13} className="text-gray-400" />
                              <span className="text-xs text-gray-500 font-medium">
                                {v.day_of_week}, {new Date(v.recorded_at || v.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {v.chief_complaint && (
                              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full font-medium truncate max-w-[180px]">
                                {v.chief_complaint}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {v.bp_systolic && (
                              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-red-400 font-medium">Blood Pressure</p>
                                <p className="text-sm font-bold text-red-700">{v.bp_systolic}/{v.bp_diastolic} <span className="text-xs font-normal">mmHg</span></p>
                              </div>
                            )}
                            {v.pulse && (
                              <div className="bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-pink-400 font-medium">Pulse</p>
                                <p className="text-sm font-bold text-pink-700">{v.pulse} <span className="text-xs font-normal">bpm</span></p>
                              </div>
                            )}
                            {v.temperature && (
                              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-orange-400 font-medium">Temperature</p>
                                <p className="text-sm font-bold text-orange-700">{v.temperature}°F</p>
                              </div>
                            )}
                            {v.spo2 && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-blue-400 font-medium">SpO2</p>
                                <p className="text-sm font-bold text-blue-700">{v.spo2}%</p>
                              </div>
                            )}
                            {v.weight && (
                              <div className="bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-teal-400 font-medium">Weight</p>
                                <p className="text-sm font-bold text-teal-700">{v.weight} kg</p>
                              </div>
                            )}
                            {v.height && (
                              <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-violet-400 font-medium">Height</p>
                                <p className="text-sm font-bold text-violet-700">{v.height} cm</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Visit History */}
                {activeTab === 'visits' && (
                  <div className="p-5">
                    <div className="text-center py-10 text-gray-400 space-y-2">
                      <FileText size={28} className="mx-auto opacity-20" />
                      <p className="text-sm font-medium">Visit history linked via token records</p>
                      <code className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg block mx-auto w-fit">
                        GET /api/patients/{selectedPatient.uhid}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] bg-white rounded-2xl shadow-sm border border-dashed border-gray-200 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                  <User size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">Select a patient to view records</p>
                <p className="text-gray-400 text-xs">Search by UHID or name above</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default PatientHistory;
