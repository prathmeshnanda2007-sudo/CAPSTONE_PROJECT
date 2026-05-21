import { Bell, Search, UserCircle } from 'lucide-react';

export const Header = () => {
  return (
    <header className="h-16 glass border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center flex-1">
        <div className="relative w-64 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search API documentation..." 
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-full py-1.5 pl-9 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="relative p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-blue-500 rounded-full border border-[var(--background)]"></span>
        </button>
        <div className="h-6 w-px bg-[var(--border)] mx-1"></div>
        <button className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-white/5 transition-colors">
          <UserCircle className="w-7 h-7 text-gray-300" />
          <span className="text-sm font-medium text-gray-300 pr-2 hidden md:block">Acme Corp</span>
        </button>
      </div>
    </header>
  );
};
