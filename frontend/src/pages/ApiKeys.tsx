import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';
import { getApiKeys, createApiKey, deleteApiKey } from '../services/api';

export const ApiKeys = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchKeys = async () => {
    try {
      const res = await getApiKeys();
      if (res.success) {
        setKeys(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch keys', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    const name = window.prompt('Enter a name for the new API key (e.g. Production App):');
    if (!name) return;
    
    try {
      const res = await createApiKey(name);
      if (res.success) {
        // Show the user the full key once
        window.alert(`Your new API Key is: \n\n${res.data.fullKey}\n\nPlease copy it now. You will not be able to see it again!`);
        fetchKeys();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create key.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this key? Any applications using it will immediately lose access.')) return;
    
    try {
      const res = await deleteApiKey(id);
      if (res.success) {
        fetchKeys();
      }
    } catch (error) {
      console.error(error);
      alert('Failed to delete key.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">API Keys</h1>
          <p className="text-gray-400 text-sm">Manage your authentication keys to access the Village API.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Key
        </button>
      </div>

      <div className="glass-card rounded-xl border border-[var(--border)] overflow-hidden mb-8 stagger-1">
        <div className="p-6 border-b border-[var(--border)] flex items-start space-x-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Security Recommendation</h3>
            <p className="text-gray-400 text-sm mb-3">Never expose your API keys in client-side code like browsers or mobile apps. Always route requests through your own backend.</p>
            <button className="text-primary text-sm font-medium hover:underline">Read security best practices &rarr;</button>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center h-48 text-gray-400">Loading keys...</div>
          ) : keys.length === 0 ? (
            <div className="flex justify-center items-center h-48 text-gray-500">No API keys found. Create one to get started.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-white/5">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Secret Key</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Used</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <Key className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="font-medium text-gray-200">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <code className="bg-black/30 px-2 py-1 rounded text-gray-300 font-mono text-sm mr-2 border border-gray-800">
                          {item.key}
                        </code>
                        <button 
                          onClick={() => handleCopy(item.id, item.key)}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {copiedId === item.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-sm text-gray-400">{item.lastUsed ? new Date(item.lastUsed).toLocaleDateString() : 'Never'}</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <div className="glass-card rounded-xl p-6 stagger-2 flex items-start space-x-4 border border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-amber-500 mb-1">Rate Limits</h3>
          <p className="text-amber-500/80 text-sm">Your current plan is limited to 1,000,000 requests per month and 50 requests per second. If you need higher limits, please upgrade your plan.</p>
        </div>
      </div>
    </div>
  );
};
