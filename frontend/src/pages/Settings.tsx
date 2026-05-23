import { Settings as SettingsIcon, User, Building, CreditCard, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Settings = () => {
  const { user } = useAuthStore();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Account Settings
          </h1>
          <p className="text-gray-400 text-sm">
            Manage your personal profile, organization details, and billing preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-lg font-medium transition-colors">
            <User className="w-5 h-5" />
            Profile
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg font-medium transition-colors">
            <Building className="w-5 h-5" />
            Organization
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg font-medium transition-colors">
            <CreditCard className="w-5 h-5" />
            Billing & Plans
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-lg font-medium transition-colors">
            <Shield className="w-5 h-5" />
            Security
          </button>
        </div>

        {/* Content Area */}
        <div className="col-span-1 md:col-span-2 space-y-6 stagger-1">
          <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
            <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">First Name</label>
                  <input type="text" defaultValue="Admin" className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Last Name</label>
                  <input type="text" defaultValue="User" className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
                <input type="email" disabled defaultValue={user?.email || 'admin@example.com'} className="w-full bg-black/50 border border-[var(--border)] rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">To change your email address, please contact support.</p>
              </div>
              <div className="pt-4">
                <button type="button" className="bg-primary text-[var(--primary-foreground)] font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
            <h2 className="text-xl font-semibold text-white mb-2">Delete Account</h2>
            <p className="text-sm text-gray-400 mb-6">Permanently remove your account and all associated API keys from the Village platform. This action cannot be undone.</p>
            <button type="button" className="bg-red-500/10 text-red-500 border border-red-500/20 font-semibold py-2 px-6 rounded-lg hover:bg-red-500/20 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
