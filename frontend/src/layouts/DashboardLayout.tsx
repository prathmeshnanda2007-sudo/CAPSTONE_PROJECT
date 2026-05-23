import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-[var(--background)] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full">
        {/* Background glow effects removed for cleaner minimal look */}
        
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 z-10 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
