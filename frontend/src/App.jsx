import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Activity, History,
  Stethoscope, Bell, ChevronRight
} from 'lucide-react';
import QueueDashboard from './pages/QueueDashboard';
import TokenDesk from './pages/TokenDesk';
import VitalsCapture from './pages/VitalsCapture';
import PatientHistory from './pages/PatientHistory';

function App() {
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { path: '/',        label: 'Queue Dashboard', icon: LayoutDashboard, color: 'from-indigo-500 to-purple-600' },
    { path: '/token',   label: 'Token Desk',      icon: Ticket,          color: 'from-blue-500 to-cyan-500' },
    { path: '/vitals',  label: 'Vitals Capture',  icon: Activity,        color: 'from-emerald-500 to-teal-500' },
    { path: '/history', label: 'Patient History',  icon: History,         color: 'from-orange-500 to-pink-500' },
  ];

  const currentNav = navItems.find(i => i.path === location.pathname) || navItems[0];

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#0f172a'}}>

      {/* ── SIDEBAR ── */}
      <aside className="w-64 flex flex-col flex-shrink-0 relative"
        style={{background:'linear-gradient(180deg,#1e1b4b 0%,#0f172a 100%)'}}>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{background:'radial-gradient(circle,#818cf8,transparent)',transform:'translate(30%,-30%)'}} />
        <div className="absolute bottom-20 left-0 w-24 h-24 rounded-full opacity-10"
          style={{background:'radial-gradient(circle,#a78bfa,transparent)',transform:'translate(-30%,0)'}} />

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">SRM Medical</h1>
              <p className="text-indigo-300 text-xs mt-0.5">OPD Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={isActive ? {background:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',border:'1px solid rgba(99,102,241,0.3)'} : {}}
              >
                {isActive && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b ${item.color}`} />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive ? `bg-gradient-to-br ${item.color} shadow-md` : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom info */}
        <div className="px-4 py-6 border-t border-white/5">
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-indigo-300 text-xs font-medium">System Status</div>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-semibold">All Systems Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center flex-shrink-0 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${currentNav.color}`}>
                <currentNav.icon size={14} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{currentNav.label}</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 pl-9">
              {time.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors relative">
              <Bell size={16} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">
                {time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Routes>
            <Route path="/"        element={<QueueDashboard />} />
            <Route path="/token"   element={<TokenDesk />} />
            <Route path="/vitals"  element={<VitalsCapture />} />
            <Route path="/history" element={<PatientHistory />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
