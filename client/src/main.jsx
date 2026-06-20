import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './extra.css';

// /admin yo'lida alohida admin panel, aks holda asosiy ilova.
const isAdminRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/admin')
  || window.location.pathname.startsWith('/admin');

const root = createRoot(document.getElementById('root'));

if (isAdminRoute) {
  import('./admin/AdminApp.jsx').then(({ default: AdminApp }) => {
    root.render(<AdminApp />);
  });
} else {
  root.render(<App />);
}
