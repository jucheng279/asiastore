import React from 'react';
import { Outlet } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';

const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <div className="flex-1 lg:ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default AppShell;
