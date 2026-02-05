
import React, { useState } from 'react';

export interface PrintSettings {
  orientation: 'landscape' | 'portrait';
  paperSize: 'A5' | 'A4';
}

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: PrintSettings) => void;
}

const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [settings, setSettings] = useState<PrintSettings>({
    orientation: 'landscape',
    paperSize: 'A5'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#720000]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border-4 border-[#D4AF37] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-[#720000] p-8 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Printer Configuration</h2>
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mt-1">Output Hardware Management</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="p-10 space-y-8">
          {/* Orientation Selection */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Output Orientation</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSettings({ ...settings, orientation: 'landscape' })}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${settings.orientation === 'landscape' ? 'bg-[#720000]/5 border-[#720000] text-[#720000]' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <i className="fas fa-image text-3xl"></i>
                <span className="text-xs font-black uppercase">Landscape</span>
              </button>
              <button
                onClick={() => setSettings({ ...settings, orientation: 'portrait' })}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${settings.orientation === 'portrait' ? 'bg-[#720000]/5 border-[#720000] text-[#720000]' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <i className="fas fa-portrait text-3xl"></i>
                <span className="text-xs font-black uppercase">Portrait</span>
              </button>
            </div>
          </div>

          {/* Paper Size Selection */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Paper Standard</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSettings({ ...settings, paperSize: 'A5' })}
                className={`flex items-center justify-between px-6 py-5 rounded-3xl border-2 transition-all ${settings.paperSize === 'A5' ? 'bg-green-50 border-green-600 text-green-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-file-alt"></i>
                  <span className="text-xs font-black uppercase tracking-widest">A5 (Hospital Std)</span>
                </div>
                {settings.paperSize === 'A5' && <i className="fas fa-check-circle"></i>}
              </button>
              <button
                onClick={() => setSettings({ ...settings, paperSize: 'A4' })}
                className={`flex items-center justify-between px-6 py-5 rounded-3xl border-2 transition-all ${settings.paperSize === 'A4' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-file-medical"></i>
                  <span className="text-xs font-black uppercase tracking-widest">A4 (Full Sheet)</span>
                </div>
                {settings.paperSize === 'A4' && <i className="fas fa-check-circle"></i>}
              </button>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-5 rounded-2xl border-2 border-slate-200 text-slate-500 font-black uppercase text-xs hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(settings)}
              className="flex-1 py-5 rounded-2xl bg-[#720000] text-[#D4AF37] font-black uppercase text-xs shadow-xl shadow-[#720000]/20 border-2 border-[#D4AF37]/50 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <i className="fas fa-print"></i>
              Confirm & Print
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center gap-3">
          <i className="fas fa-info-circle text-[#720000] text-xs"></i>
          <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
            Selected settings will be applied to the system print stream. Ensure printer tray is stocked with the correct media.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrintSettingsModal;
