import React from 'react';
import { PatientRecord, Department } from '../types';
import { QRCodeSVG } from 'qrcode.react';

interface PatientSlipProps {
  record: PatientRecord;
  onQrClick?: () => void;
}

const encodeRecordToUrl = (record: PatientRecord): string => {
  try {
    const jsonString = JSON.stringify(record);
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?pid=${record.id}#view=${base64}`;
  } catch (e) {
    console.error("Failed to encode record for QR code", e);
    return record.id;
  }
};

export const Logo: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <div className={`relative flex items-center justify-center ${className} bg-white rounded-2xl p-1 shadow-sm overflow-hidden`}>
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 L85 20 V50 C85 75 50 95 50 95 C50 95 15 75 15 50 V20 L50 5Z" fill="#720000" />
      <path d="M50 10 L80 23 V50 C80 70 50 88 50 88 C50 88 20 70 20 50 V23 L50 10Z" fill="white" />
      <rect x="44" y="25" width="12" height="30" rx="2" fill="#720000" />
      <rect x="35" y="34" width="30" height="12" rx="2" fill="#720000" />
      <path d="M30 65 Q50 60 70 65 V78 Q50 73 30 78 Z" fill="#D4AF37" />
      <path d="M50 63 V75" stroke="white" strokeWidth="2" />
      <path d="M35 68 H45 M35 72 H45 M55 68 H65 M55 72 H65" stroke="white" strokeWidth="1" />
      <circle cx="50" cy="18" r="2" fill="#D4AF37" />
      <circle cx="28" cy="28" r="1.5" fill="#D4AF37" />
      <circle cx="72" cy="28" r="1.5" fill="#D4AF37" />
    </svg>
  </div>
);

const PatientSlip: React.FC<PatientSlipProps> = ({ record, onQrClick }) => {
  const shareableUrl = encodeRecordToUrl(record);

  return (
    <div className="bg-white border-4 border-[#720000] p-8 w-full h-full mx-auto shadow-2xl print:shadow-none print:border-4 print:m-0 relative overflow-hidden flex flex-col box-border">
      {/* Background Watermarks */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
        <i className="fas fa-hospital text-[350px] rotate-[-15deg] text-[#720000]"></i>
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-[0.18] pointer-events-none select-none z-0">
        <span className="text-xl font-black text-[#720000] whitespace-nowrap uppercase tracking-[0.5em] italic">Developed By Armaghaan Rajput</span>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none select-none z-0 rotate-[45deg]">
        <span className="text-6xl font-black text-slate-400 whitespace-nowrap uppercase tracking-[1em]">OFFICIAL RECORD</span>
      </div>

      <div className="border-b-4 border-[#D4AF37] pb-6 mb-6 flex justify-between items-center relative z-10 bg-white/80 backdrop-blur-[2px]">
        <div className="flex items-center gap-8">
          <Logo className="w-28 h-28" />
          <div>
            <h1 className="text-4xl font-black text-[#720000] leading-tight tracking-tighter uppercase">IBN-E-RAMZAN</h1>
            <h2 className="text-xl font-bold text-slate-700 uppercase tracking-wide">Educational & Medical Complex</h2>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                <i className="fas fa-map-marker-alt text-[#720000]"></i>
                <span>34-KM Main Feroz Pur Road Mustafabad Lalyani</span>
              </div>
              <div className="flex items-center gap-4 text-[#720000] font-black text-[12px] tracking-widest">
                <div className="flex items-center gap-2">
                  <i className="fas fa-phone-alt"></i>
                  <span>0492450412</span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-2">
                  <i className="fas fa-phone-alt"></i>
                  <span>0492450335</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Token</span>
            <div className="px-8 py-3 rounded-xl bg-[#720000] text-white font-black text-5xl border-2 border-[#D4AF37] shadow-lg print:shadow-none">
              {record.tokenNumber}
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-black border-2 uppercase ${record.department === Department.EMERGENCY ? 'bg-red-50 border-red-600 text-red-600' : 'bg-green-50 border-green-600 text-green-600'}`}>
            {record.department} UNIT
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 mb-8 relative z-10">
        <div className="col-span-8 space-y-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Patient Name</label>
              <span className="text-2xl font-black text-slate-900 leading-tight block truncate">{record.name}</span>
            </div>
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Age / Sex / Status</label>
              <span className="text-xl font-bold text-slate-900 block truncate">{record.age}Y / {record.gender} / {record.maritalStatus}</span>
            </div>
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Contact Number</label>
              <span className="text-xl font-bold text-slate-900 block truncate">{record.contactNumber || 'N/A'}</span>
            </div>
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Payment Status</label>
              <span className={`text-xl font-black uppercase block truncate ${record.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600 animate-pulse'}`}>
                {record.paymentStatus}
              </span>
            </div>
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Issuance Timestamp</label>
              <span className="text-lg font-black text-[#720000] leading-tight block">{record.timestamp}</span>
            </div>
            <div className="border-b-2 border-slate-100 pb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Reference ID</label>
              <span className="text-lg font-mono font-bold text-slate-500 uppercase block">{record.id}</span>
            </div>
          </div>

          <div className="pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Triage Note & Chief Complaints</label>
            <div className="p-5 bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100 rounded-2xl relative shadow-inner print:shadow-none min-h-[100px]">
              <div className="flex justify-between items-start">
                <p className="text-slate-800 font-bold text-lg leading-snug">"{record.reasonForVisit}"</p>
                {record.needsUltrasound && (
                  <div className="bg-pink-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-pink-200">
                    Ultrasound Req.
                  </div>
                )}
              </div>
              {record.triageNote && (
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-start gap-3">
                  <div className="bg-[#720000] text-[#D4AF37] p-2 rounded-lg text-xs flex-shrink-0">
                    <i className="fas fa-robot"></i>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#720000] uppercase tracking-widest mb-0.5">Automated Clinical Analysis</p>
                    <p className="text-xs font-semibold text-slate-600 italic leading-relaxed">{record.triageNote}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-[#720000]/5 border-2 border-[#720000]/10 rounded-2xl p-5">
            <h3 className="text-[11px] font-black text-[#720000] uppercase text-center mb-6 tracking-[0.2em]">Vital Signs Check</h3>
            <div className="space-y-4">
              {[
                { label: 'Blood Pressure', unit: 'mmHg' },
                { label: 'Body Temp', unit: '°F' },
                { label: 'Pulse Rate', unit: 'bpm' },
                { label: 'Weight', unit: 'kg' },
                { label: 'SpO2 Level', unit: '%' }
              ].map((v) => (
                <div key={v.label} className="flex justify-between items-end border-b border-dashed border-[#720000]/20 pb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">{v.label}</span>
                  <span className="text-[9px] text-slate-300 font-mono ml-1">{v.unit}</span>
                  <div className="flex-1 mx-2 border-b border-slate-100"></div>
                  <div className="w-12 h-4"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center mt-auto">
            <div 
              className="group relative p-3 bg-white border-2 border-[#720000]/10 rounded-2xl shadow-sm cursor-pointer hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 transition-all duration-300 active:scale-95 no-print"
              onClick={onQrClick}
              title="Click to Verify Identity"
            >
              <QRCodeSVG 
                value={shareableUrl} 
                size={90} 
                fgColor="#720000" 
                includeMargin={false}
                level="L"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-[#720000]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                 <div className="bg-white/80 p-2 rounded-full shadow-lg">
                    <i className="fas fa-search-plus text-[#720000] text-sm"></i>
                 </div>
              </div>
            </div>
            {/* Printed QR Code (no hover/interactive effects) */}
            <div className="hidden print:block border-2 border-slate-200 p-2 rounded-xl">
               <QRCodeSVG value={shareableUrl} size={80} fgColor="#000000" />
            </div>
            <span className="text-[9px] font-mono tracking-widest uppercase mt-2 text-slate-500 font-bold">SCAN TO VERIFY</span>
          </div>
        </div>
      </div>

      <div className="flex-1 border-2 border-dashed border-[#720000]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-300 relative min-h-[80px] z-10 bg-white/50">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-center opacity-40">Consultant Clinical Notes Area</span>
        <i className="fas fa-user-md absolute top-4 right-4 text-slate-50 opacity-10 text-6xl"></i>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-[#D4AF37] flex justify-between items-end relative z-10 bg-white/80">
        <div className="max-w-[50%]">
          <p className="text-[10px] font-black text-[#720000] uppercase tracking-widest mb-2">Hospital Policy:</p>
          <p className="text-[9px] text-slate-400 font-semibold leading-relaxed italic">
            This slip is generated at registration and valid for 24 hours. Registration into complex management system verified.
          </p>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col items-center">
            <div className="w-32 h-10 border-b border-slate-400 mb-1"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical Registrar</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-32 h-10 border-b border-slate-400 mb-1"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Official Stamp</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSlip;