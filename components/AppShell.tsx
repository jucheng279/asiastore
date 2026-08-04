import React from 'react';
import { Outlet } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';

const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <DesktopSidebar />
      <div className="flex-1 lg:ml-64 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default AppShell;
