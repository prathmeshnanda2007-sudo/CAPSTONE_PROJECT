import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../services/api';

const FREE_EMAIL_DOMAINS = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','live.com',
  'icloud.com','aol.com','protonmail.com','ymail.com','rediffmail.com',
];

const validateBusinessEmail = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'Enter a valid email address.';
  if (FREE_EMAIL_DOMAINS.includes(domain)) {
    return 'Please use your business email address (not Gmail, Yahoo, etc.).';
  }
  return '';
};

export const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    gstNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailBlur = () => {
    if (form.email) setEmailError(validateBusinessEmail(form.email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    const emailErr = validateBusinessEmail(form.email);
    if (emailErr) { setEmailError(emailErr); return; }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!form.businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        businessName: form.businessName.trim(),
        phone: form.phone.trim() || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px]" />
        </div>
        <div className="relative w-full max-w-md animate-fade-in text-center">
          <div className="glass-card rounded-2xl p-10">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Your account request is <span className="text-amber-400 font-medium">pending approval</span>.
              Our team will review your business details and send you an email once approved (usually within 24 hours).
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary text-[var(--primary-foreground)] font-semibold py-2.5 px-4 rounded-lg hover:bg-primary/90 transition-all duration-200"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 py-10">
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Village API
          </span>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Request API Access</h1>
          <p className="text-gray-400 text-sm mb-6">
            B2B platform — your account will be reviewed before activation.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
            {/* Business Name */}
            <div>
              <label htmlFor="reg-business" className="block text-sm font-medium text-gray-300 mb-1.5">
                Business / Company Name <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-business"
                type="text"
                required
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Acme Solutions Pvt. Ltd."
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            {/* Business Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Business Email <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailError(''); }}
                onBlur={handleEmailBlur}
                placeholder="you@company.com"
                className={`w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                  emailError ? 'border-red-500' : 'border-[var(--border)] focus:border-primary'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {emailError}
                </p>
              )}
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-300 mb-1.5">
                Phone <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            {/* GST (optional) */}
            <div>
              <label htmlFor="reg-gst" className="block text-sm font-medium text-gray-300 mb-1.5">
                GST Number <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="reg-gst"
                type="text"
                value={form.gstNumber}
                onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-[var(--input)] border border-[var(--border)] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 rounded-lg bg-[var(--input)] border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red-500'
                    : 'border-[var(--border)] focus:border-primary'
                }`}
              />
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-[var(--primary-foreground)] font-semibold py-2.5 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting request…
                </>
              ) : (
                'Request Access'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          © {new Date().getFullYear()} Village API · B2B Data Platform
        </p>
      </div>
    </div>
  );
};
