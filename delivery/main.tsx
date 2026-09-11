import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DeliveryApp } from './DeliveryApp';
import '../inventory/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeliveryApp />
  </StrictMode>
);
