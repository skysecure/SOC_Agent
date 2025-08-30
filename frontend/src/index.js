import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import Dashboard from './Dashboard';
// import AIFeatureTest from './components/AIFeatureTest';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* <Route path="/ai-test" element={<AIFeatureTest />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);