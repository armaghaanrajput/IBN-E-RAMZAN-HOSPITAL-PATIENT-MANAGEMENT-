import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Department, Gender, MaritalStatus, PatientRecord, PaymentStatus } from './types';
import PatientSlip, { Logo } from './components/PatientSlip';
import { getTriageSuggestion } from './services/geminiService';
import PrintSettingsModal, { PrintSettings } from './components/PrintSettingsModal';

type Tab = 'dashboard' | 'register' | 'history';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [currentTimeOnly, setCurrentTimeOnly] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSlip, setCurrentSlip] = useState<PatientRecord | null>(null);
  const [scannedRecord, setScannedRecord] = useState<PatientRecord | null>(null);
  const [nextToken, setNextToken] = useState<number>(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [pendingPrintRecord, setPendingPrintRecord] = useState<PatientRecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    age: '',
    gender: Gender.MALE,
    maritalStatus: MaritalStatus.SINGLE,
    department: Department.OPD,
    reason: '',
    needsUltrasound: false,
    paymentStatus: 'Paid' as PaymentStatus
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#view=')) {
        try {
          const base64 = hash.replace('#view=', '');
          const decoded = decodeURIComponent(escape(atob(base64)));
          const record: PatientRecord = JSON.parse(decoded);
          if (record && record.id) {
            setScannedRecord(record);
            setCurrentSlip(record);
          }
        } catch (e) {
          console.error("Failed to decode patient record from URL", e);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeOnly(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
      }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('ibne_records');
      const savedTokenInfo = localStorage.getItem('ibne_token_info');
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        if (Array.isArray(parsed)) setRecords(parsed);
      }
      const today = new Date().toLocaleDateString();
      if (savedTokenInfo) {
        const parsed = JSON.parse(savedTokenInfo);
        if (parsed?.date === today) setNextToken((parsed.lastToken || 0) + 1);
        else setNextToken(1);
      }
    } catch (error) {
      console.error("Load state error", error);
    }
  }, []);

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const todayRecords = records.filter(r => r.timestamp.includes(todayStr));
    return {
      total: todayRecords.length,
      opd: todayRecords.filter(r => r.department === Department.OPD).length,
      emergency: todayRecords.filter(r => r.department === Department.EMERGENCY).length,
      paid: todayRecords.filter(r => r.paymentStatus === 'Paid').length,
      unpaid: todayRecords.filter(r => r.paymentStatus === 'Not Paid').length,
      ultrasound: todayRecords.filter(r => r.needsUltrasound).length
    };
  }, [records]);

  const saveRecord = useCallback((record: PatientRecord) => {
    setRecords(prev => {
      if (prev.some(r => r.id === record.id)) return prev;
      const updated = [record, ...prev].slice(0, 1000);
      localStorage.setItem('ibne_records', JSON.stringify(updated));
      return updated;
    });
    const today = new Date().toLocaleDateString();
    localStorage.setItem('ibne_token_info', JSON.stringify({ lastToken: parseInt(record.tokenNumber), date: today }));
    setNextToken(prev => prev + 1);
  }, []);

  const getExactNowTimestamp = () => {
    const now = new Date();
    const d = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${d} at ${t}`;
  };

  const generateRecord = useCallback((): PatientRecord => {
    return {
      id: `IBN-${Date.now().toString().slice(-6)}`,
      tokenNumber: nextToken.toString().padStart(3, '0'),
      name: formData.name,
      contactNumber: formData.contactNumber,
      age: formData.age,
      gender: formData.gender,
      maritalStatus: formData.maritalStatus,
      department: formData.department,
      reasonForVisit: formData.reason,
      timestamp: getExactNowTimestamp(),
      paymentStatus: formData.paymentStatus,
      needsUltrasound: formData.needsUltrasound
    };
  }, [formData, nextToken]);

  const handleSaveOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.age) return alert("Please fill name and age.");
    const record = generateRecord();
    saveRecord(record);
    setFormData({ 
      name: '', contactNumber: '', age: '', gender: Gender.MALE, 
      maritalStatus: MaritalStatus.SINGLE, department: Department.OPD, 
      reason: '', needsUltrasound: false, paymentStatus: 'Paid' 
    });
    alert("Record Saved Successfully!");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.age) return alert("Fill mandatory fields.");
    const newRecord = generateRecord();
    setCurrentSlip(newRecord);
  };

  const handleAiTriage = async () => {
    if (!formData.reason || !formData.age) return alert("Enter Age and Reason for AI suggestions.");
    setIsAiLoading(true);
    const suggestion = await getTriageSuggestion(formData.reason, formData.age, formData.gender);
    if (suggestion) {
      setFormData(prev => ({ ...prev, department: suggestion.department }));
      // We don't save immediately, just update the UI
    }
    setIsAiLoading(false);
  };

  const executeFinalPrint = (settings: PrintSettings) => {
    if (!pendingPrintRecord) return;
    const finalRecord = { ...pendingPrintRecord };
    setCurrentSlip(finalRecord);
    if (!records.some(r => r.id === finalRecord.id)) saveRecord(finalRecord);

    const styleId = 'dynamic-print-overrides';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    const pageSize = settings.paperSize === 'A4' ? '210mm 297mm' : '210mm 148mm';
    styleTag.innerHTML = `@media print { @page { size: ${pageSize} ${settings.orientation} !important; margin: 0 !important; } }`;

    setTimeout(() => {
      window.print();
      setIsPrintModalOpen(false);
      setPendingPrintRecord(null);
      // Reset form if it was a new registration
      if (activeTab === 'register') {
         setFormData({ 
           name: '', contactNumber: '', age: '', gender: Gender.MALE, 
           maritalStatus: MaritalStatus.SINGLE, department: Department.OPD, 
           reason: '', needsUltrasound: false, paymentStatus: 'Paid' 
         });
         setCurrentSlip(null);
      }
    }, 500);
  };

  const exportToCSV = () => {
    if (records.length === 0) return alert("No records to export.");
    const headers = ["Reference ID", "Token", "Name", "Contact", "Age", "Gender", "Status", "Payment", "Dept", "Reason", "Ultrasound", "Timestamp"];
    const rows = records.map(r => [
      r.id,
      r.tokenNumber,
      `"${r.name}"`,
      r.contactNumber || 'N/A',
      r.age,
      r.gender,
      r.maritalStatus,
      r.paymentStatus,
      r.department,
      `"${r.reasonForVisit.replace(/"/g, '""')}"`,
      r.needsUltrasound ? "YES" : "NO",
      r.timestamp
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IBNE_HOSPITAL_LOG_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => 
    (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.tokenNumber || '').includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} sidebar-transition bg-[#720000] text-white flex flex-col no-print border-r-4 border-[#D4AF37] shadow-2xl relative z-40`}>
        <div className="p-6 flex items-center gap-4 border-b border-[#D4AF37]/20 overflow-hidden">
          <Logo className="w-10 h-10 shrink-0" />
          {isSidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="text-xl font-black uppercase tracking-tighter whitespace-nowrap">IBN-E-RAMZAN</h1>
              <p className="text-[8px] text-[#D4AF37] uppercase font-bold tracking-widest">Medical Complex</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 py-8 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
            { id: 'register', label: 'Register', icon: 'fa-user-plus' },
            { id: 'history', label: 'History', icon: 'fa-clipboard-list' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-white/10 text-[#D4AF37] border-l-4 border-[#D4AF37]' : 'hover:bg-white/5 text-white/70'}`}>
              <i className={`fas ${item.icon} w-6 text-center`}></i>
              {isSidebarOpen && <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-[#D4AF37]/20 flex justify-center">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-all">
            <i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 no-print shrink-0 relative z-30 shadow-sm">
          <h2 className="text-2xl font-black text-[#720000] uppercase tracking-tighter">
            {activeTab === 'dashboard' ? 'Analytical Dashboard' : activeTab === 'register' ? 'Patient Enrollment' : 'Medical Archive'}
          </h2>
          <div className="flex items-center gap-8">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status: <span className="text-green-500">Online</span></p>
                <p className="text-sm font-mono font-bold text-slate-800">{currentTimeOnly}</p>
             </div>
             <div className="h-12 w-12 rounded-2xl bg-[#720000] text-[#D4AF37] flex items-center justify-center shadow-lg border-2 border-[#D4AF37] hover:rotate-6 transition-all cursor-pointer">
                <i className="fas fa-id-badge text-xl"></i>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 no-print custom-scrollbar bg-[#f8fafc]">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Today's Queue", val: stats.total, icon: "fa-users", bg: "bg-white", txt: "text-[#720000]", iBg: "bg-[#720000]" },
                  { label: "OPD Arrivals", val: stats.opd, icon: "fa-stethoscope", bg: "bg-white", txt: "text-green-600", iBg: "bg-green-600" },
                  { label: "Critical ER", val: stats.emergency, icon: "fa-heartbeat", bg: "bg-white", txt: "text-red-600", iBg: "bg-red-600" },
                  { label: "Fee Collected", val: stats.paid, icon: "fa-hand-holding-usd", bg: "bg-white", txt: "text-blue-600", iBg: "bg-blue-600" }
                ].map((s, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-md transition-all">
                    <div className={`${s.iBg} h-14 w-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                      <i className={`fas ${s.icon}`}></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                      <p className={`text-3xl font-black ${s.txt}`}>{s.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 overflow-hidden">
                   <div className="flex justify-between items-center mb-8">
                     <h3 className="text-xl font-black text-[#720000] uppercase tracking-tighter flex items-center gap-3">
                       <i className="fas fa-list-ol text-[#D4AF37]"></i> Recent Admissions
                     </h3>
                     <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-[#720000] uppercase tracking-widest hover:underline">View All Records</button>
                   </div>
                   <div className="space-y-4">
                     {records.slice(0, 6).map((r, i) => (
                       <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#720000]/20 transition-all cursor-pointer" onClick={() => {setCurrentSlip(r); setActiveTab('register');}}>
                         <div className="flex items-center gap-5">
                            <div className="bg-[#720000] text-[#D4AF37] w-12 h-12 rounded-xl flex items-center justify-center font-black">{r.tokenNumber}</div>
                            <div>
                               <p className="font-bold text-slate-800 text-lg leading-none">{r.name}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{r.department} • {r.timestamp}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${r.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.paymentStatus}</span>
                            <i className="fas fa-chevron-right text-slate-200"></i>
                         </div>
                       </div>
                     ))}
                     {records.length === 0 && <div className="py-20 text-center"><i className="fas fa-folder-open text-slate-100 text-8xl mb-4"></i><p className="text-slate-300 font-black uppercase tracking-widest">No Activity Logged</p></div>}
                   </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col">
                  <h3 className="text-xl font-black text-[#720000] uppercase tracking-tighter mb-8">Live Statistics</h3>
                  <div className="space-y-8 flex-1">
                    {[
                      { l: 'OPD Patients', c: stats.opd, t: stats.total, clr: 'bg-green-500' },
                      { l: 'Emergency Cases', c: stats.emergency, t: stats.total, clr: 'bg-red-500' },
                      { l: 'Ultrasound Queue', c: stats.ultrasound, t: stats.total, clr: 'bg-pink-500' }
                    ].map((bar, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{bar.l}</span>
                          <span className="text-sm font-black text-[#720000]">{bar.c}</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                          <div className={`h-full ${bar.clr} rounded-full transition-all duration-1000 shadow-lg`} style={{ width: `${(bar.c / (bar.t || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
                     <Logo className="w-16 h-16 grayscale opacity-20" />
                     <p className="text-[10px] font-black text-slate-300 text-center uppercase leading-relaxed tracking-widest">Official Management System<br/>v2.5.0 Stable Release</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-10 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex-1">
                <div className="bg-white rounded-[3rem] shadow-2xl p-10 border-4 border-white">
                  <div className="flex justify-between items-start mb-10">
                    <h3 className="text-xl font-black text-[#720000] uppercase tracking-widest flex items-center gap-4">
                      <i className="fas fa-file-medical-alt text-[#D4AF37]"></i> Personal Particulars
                    </h3>
                    <button 
                      type="button" 
                      onClick={handleAiTriage} 
                      disabled={isAiLoading || !formData.reason} 
                      className="bg-[#720000]/5 hover:bg-[#720000] text-[#720000] hover:text-[#D4AF37] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center gap-2 border border-[#720000]/10"
                    >
                      <i className={`fas ${isAiLoading ? 'fa-spinner fa-spin' : 'fa-brain'}`}></i>
                      AI Assistant
                    </button>
                  </div>
                  
                  <form className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-[#720000] focus:ring-4 focus:ring-[#720000]/5 outline-none font-bold text-lg transition-all" placeholder="Enter patient name..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Mobile</label>
                        <input type="tel" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-[#720000] outline-none font-bold text-lg transition-all" placeholder="03xx-xxxxxxx" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                        <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-[#720000] outline-none font-bold text-lg transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                        <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-[#720000] outline-none font-bold text-lg cursor-pointer transition-all"><option value={Gender.MALE}>Male</option><option value={Gender.FEMALE}>Female</option><option value={Gender.OTHER}>Other</option></select>
                      </div>
                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Type</label>
                        <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value as PaymentStatus})} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:border-[#720000] outline-none font-black text-lg transition-all ${formData.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}`}><option value="Paid">PAID (Standard Fee)</option><option value="Not Paid">NOT PAID / FREE</option></select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Assignment</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setFormData({...formData, department: Department.OPD})} className={`py-4 rounded-2xl border-2 font-black transition-all ${formData.department === Department.OPD ? 'bg-green-50 border-green-600 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>OPD UNIT</button>
                        <button type="button" onClick={() => setFormData({...formData, department: Department.EMERGENCY})} className={`py-4 rounded-2xl border-2 font-black transition-all ${formData.department === Department.EMERGENCY ? 'bg-red-50 border-red-600 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>EMERGENCY (ER)</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Chief Complaints / History</label>
                      <textarea rows={4} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 outline-none resize-none focus:border-[#720000] font-medium text-lg leading-relaxed transition-all" placeholder="Describe symptoms or clinical reasons..."></textarea>
                    </div>
                    <div className="flex items-center gap-6 bg-[#720000]/5 p-6 rounded-[2rem] border-2 border-[#720000]/10">
                       <input type="checkbox" id="ultrasound" checked={formData.needsUltrasound} onChange={e => setFormData({...formData, needsUltrasound: e.target.checked})} className="w-8 h-8 accent-[#720000] cursor-pointer" />
                       <div>
                         <label htmlFor="ultrasound" className="text-sm font-black text-[#720000] uppercase tracking-widest cursor-pointer block leading-none mb-1">Ultrasound Examination</label>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">Enable diagnostic imaging for this patient</p>
                       </div>
                    </div>
                    
                    <div className="pt-6 flex flex-col md:flex-row gap-6">
                       <button type="button" onClick={handleSaveOnly} className="flex-1 bg-white text-[#720000] border-2 border-[#720000] py-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#720000] hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                         <i className="fas fa-save"></i> SAVE RECORD
                       </button>
                       <button type="button" onClick={() => { if(formData.name && formData.age) { setPendingPrintRecord(generateRecord()); setIsPrintModalOpen(true); }}} className="flex-1 bg-[#720000] text-[#D4AF37] py-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#5a0000] transition-all shadow-xl active:scale-95 border-2 border-[#D4AF37]/50 flex items-center justify-center gap-3">
                         <i className="fas fa-print"></i> SAVE & PRINT
                       </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="w-full xl:w-[450px] space-y-8 no-print">
                <div className="bg-slate-800 rounded-[3rem] p-12 border-8 border-slate-700 shadow-inner flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse"></div>
                  {currentSlip ? (
                    <div className="w-full space-y-10 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between text-white">
                         <h4 className="text-xl font-black uppercase tracking-widest">Medical Voucher</h4>
                         <button onClick={() => { setPendingPrintRecord(currentSlip); setIsPrintModalOpen(true); }} className="bg-[#D4AF37] text-[#720000] px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:scale-110 active:scale-90 transition-all">Command: Print</button>
                      </div>
                      <div className="w-full aspect-[210/148] scale-[0.55] xl:scale-[0.45] 2xl:scale-[0.55] origin-top border-4 border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                         <PatientSlip record={currentSlip} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center" onClick={handleManualSubmit}>
                      <div className="bg-slate-700 p-12 rounded-full shadow-2xl border-4 border-slate-600 mb-8 mx-auto w-fit group-hover:rotate-12 transition-transform duration-700 cursor-pointer">
                        <Logo className="w-24 h-24 grayscale opacity-40 brightness-200" />
                      </div>
                      <h4 className="text-white text-xl font-black uppercase tracking-[0.3em] mb-2">Live Preview</h4>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Enter data to generate voucher</p>
                    </div>
                  )}
                </div>
                <div className="bg-[#720000] p-8 rounded-[2rem] border-4 border-[#D4AF37]/30 text-white flex items-center gap-6 shadow-xl">
                   <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Assigned Unit</p>
                      <p className="text-3xl font-black">{formData.department}</p>
                   </div>
                   <div className="w-px h-12 bg-white/20"></div>
                   <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">Next Available Token</p>
                      <p className="text-4xl font-black text-white">{nextToken.toString().padStart(3, '0')}</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                 <div className="relative flex-1 w-full">
                    <input type="text" placeholder="Filter by Name, Token, Phone or Unique Ref ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-8 py-5 outline-none focus:border-[#720000] font-bold text-lg transition-all" />
                    <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                 </div>
                 <button onClick={exportToCSV} className="bg-[#720000] text-[#D4AF37] px-8 py-5 rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-3 border-2 border-[#D4AF37]/30">
                   <i className="fas fa-file-export"></i> EXPORT HISTORY (.CSV)
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                 {filteredRecords.map(r => (
                   <div key={r.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:border-[#720000]/40 transition-all group flex flex-col cursor-pointer" onClick={() => {setCurrentSlip(r); setActiveTab('register');}}>
                      <div className="flex justify-between items-start mb-8">
                         <div className="bg-[#720000] text-[#D4AF37] w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-2xl font-black shadow-lg border-2 border-[#D4AF37]/20 group-hover:scale-110 transition-transform">{r.tokenNumber}</div>
                         <button onClick={(e) => { e.stopPropagation(); setPendingPrintRecord(r); setIsPrintModalOpen(true); }} className="w-12 h-12 rounded-xl text-slate-300 hover:text-[#720000] hover:bg-[#720000]/5 transition-all flex items-center justify-center">
                           <i className="fas fa-print text-xl"></i>
                         </button>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 leading-tight mb-2 truncate">{r.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{r.id} • {r.age}Y • {r.gender}</p>
                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex gap-2">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${r.department === Department.EMERGENCY ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.department}</span>
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${r.paymentStatus === 'Paid' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{r.paymentStatus}</span>
                         </div>
                         <i className="fas fa-arrow-right text-slate-200 group-hover:translate-x-1 transition-transform"></i>
                      </div>
                   </div>
                 ))}
                 {filteredRecords.length === 0 && (
                   <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                      <i className="fas fa-search-minus text-slate-100 text-9xl mb-6"></i>
                      <h4 className="text-slate-300 text-2xl font-black uppercase tracking-widest">No matching results</h4>
                      <p className="text-slate-200 font-bold uppercase text-sm mt-2">Try adjusting your search query</p>
                   </div>
                 )}
              </div>
            </div>
          )}
        </main>

        <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-between px-10 no-print shrink-0">
           <div className="flex items-center gap-3">
              <i className="fas fa-shield-alt text-[#720000] text-xs"></i>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">End-to-End Encrypted Terminal</p>
           </div>
           <p className="text-[10px] text-[#720000] font-black uppercase tracking-[0.5em] italic">Developed By Armaghaan Rajput</p>
        </footer>
      </div>

      {/* PRINT LAYER */}
      <div className="print-only">
        {currentSlip && <PatientSlip record={currentSlip} />}
      </div>
      
      <PrintSettingsModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} onConfirm={executeFinalPrint} />

      {/* IDENTITY VERIFICATION MODAL */}
      {scannedRecord && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-3xl animate-in fade-in duration-300 no-print">
           <div className="w-full max-w-2xl bg-white rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-4 border-[#D4AF37] animate-in zoom-in-95 duration-500">
              <div className="bg-[#720000] p-10 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-[0.05] rotate-[-15deg]"><i className="fas fa-id-card text-[150px]"></i></div>
                 <div className="flex items-center gap-6 relative z-10">
                   <div className="bg-white p-3 rounded-2xl shadow-xl"><Logo className="w-10 h-10" /></div>
                   <div>
                     <h3 className="text-3xl font-black uppercase tracking-tighter">Identity Cleared</h3>
                     <p className="text-[#D4AF37] text-xs font-black uppercase tracking-widest mt-1">Hospital Registry Verified</p>
                   </div>
                 </div>
                 <button onClick={() => { setScannedRecord(null); window.history.replaceState(null, '', window.location.pathname); }} className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all relative z-10"><i className="fas fa-times text-2xl"></i></button>
              </div>
              <div className="p-16 text-center">
                 <div className="mb-10">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] block mb-4">Patient Profile</span>
                    <p className="text-6xl font-black text-slate-900 tracking-tighter mb-2">{scannedRecord.name}</p>
                    <div className="flex items-center justify-center gap-4">
                       <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full font-black text-xs uppercase">{scannedRecord.age}Y</span>
                       <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full font-black text-xs uppercase">{scannedRecord.gender}</span>
                       <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full font-black text-xs uppercase">{scannedRecord.maritalStatus}</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="bg-[#720000]/5 p-8 rounded-[2.5rem] border-2 border-[#720000]/10 flex flex-col items-center">
                       <p className="text-[10px] font-black text-[#720000]/60 uppercase tracking-widest mb-3">Live Token</p>
                       <p className="text-7xl font-black text-[#720000]">{scannedRecord.tokenNumber}</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center justify-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Placement</p>
                       <p className="text-4xl font-black text-slate-800 uppercase">{scannedRecord.department}</p>
                       {scannedRecord.needsUltrasound && <span className="mt-3 text-[10px] font-black text-pink-600 uppercase animate-pulse">Diagnostics Req.</span>}
                    </div>
                 </div>
                 <div className="flex flex-col md:flex-row gap-4">
                    <button onClick={() => { setPendingPrintRecord(scannedRecord); setIsPrintModalOpen(true); }} className="flex-1 py-6 rounded-2xl bg-[#720000] text-[#D4AF37] font-black uppercase text-sm tracking-widest shadow-2xl shadow-[#720000]/20 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-[#D4AF37]/50">
                      <i className="fas fa-print"></i> Re-Issue Duplicate
                    </button>
                    <button onClick={() => { setScannedRecord(null); window.history.replaceState(null, '', window.location.pathname); }} className="flex-1 py-6 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all">Close Profile</button>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Official Terminal Record Auth: Armaghaan Rajput</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;