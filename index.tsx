
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#720000] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#720000] font-black uppercase tracking-widest text-sm">IBN-E-RAMZAN: Loading Terminal...</p>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </React.StrictMode>
);