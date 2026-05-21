import { useState, useEffect } from 'react';
import { getStates, getDistricts, getSubDistricts, getVillages } from '../services/api';
import { MapPin, Search, Server, AlertCircle } from 'lucide-react';

interface GeoEntity {
  id: string;
  code: string;
  name: string;
}

export const DataExplorer = () => {
  const [states, setStates] = useState<GeoEntity[]>([]);
  const [districts, setDistricts] = useState<GeoEntity[]>([]);
  const [subDistricts, setSubDistricts] = useState<GeoEntity[]>([]);
  const [villages, setVillages] = useState<GeoEntity[]>([]);

  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSubDistrict, setSelectedSubDistrict] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStates = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getStates();
        if (res.success) {
          setStates(res.data);
        } else {
          setError(res.message || 'Failed to fetch states');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching states. Ensure backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchStates();
  }, []);

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stateId = e.target.value;
    setSelectedState(stateId);
    setSelectedDistrict('');
    setSelectedSubDistrict('');
    setDistricts([]);
    setSubDistricts([]);
    setVillages([]);

    if (!stateId) return;

    setLoading(true);
    setError('');
    try {
      const res = await getDistricts(stateId);
      if (res.success) {
        setDistricts(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtId = e.target.value;
    setSelectedDistrict(districtId);
    setSelectedSubDistrict('');
    setSubDistricts([]);
    setVillages([]);

    if (!districtId) return;

    setLoading(true);
    setError('');
    try {
      const res = await getSubDistricts(districtId);
      if (res.success) {
        setSubDistricts(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subDistId = e.target.value;
    setSelectedSubDistrict(subDistId);
    setVillages([]);

    if (!subDistId) return;

    setLoading(true);
    setError('');
    try {
      const res = await getVillages(subDistId);
      if (res.success) {
        setVillages(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1 flex items-center gap-3">
            <Search className="w-8 h-8 text-primary" />
            Data Explorer
          </h1>
          <p className="text-gray-400 text-sm">
            Fetch real hierarchical data directly from the FastAPI/Express backend.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-1">
        {/* State Selector */}
        <div className="glass-card p-6 rounded-xl border border-[var(--border)]">
          <label className="block text-sm font-medium text-gray-400 mb-2">1. Select State</label>
          <select 
            className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            value={selectedState}
            onChange={handleStateChange}
          >
            <option value="">-- Choose State --</option>
            {states.map(state => (
              <option key={state.id} value={state.id}>{state.name} ({state.code})</option>
            ))}
          </select>
        </div>

        {/* District Selector */}
        <div className={`glass-card p-6 rounded-xl border border-[var(--border)] transition-opacity ${!selectedState ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-medium text-gray-400 mb-2">2. Select District</label>
          <select 
            className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            value={selectedDistrict}
            onChange={handleDistrictChange}
          >
            <option value="">-- Choose District --</option>
            {districts.map(dist => (
              <option key={dist.id} value={dist.id}>{dist.name} ({dist.code})</option>
            ))}
          </select>
        </div>

        {/* Sub-District Selector */}
        <div className={`glass-card p-6 rounded-xl border border-[var(--border)] transition-opacity ${!selectedDistrict ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-medium text-gray-400 mb-2">3. Select Sub-District</label>
          <select 
            className="w-full bg-black/30 border border-[var(--border)] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            value={selectedSubDistrict}
            onChange={handleSubDistrictChange}
          >
            <option value="">-- Choose Sub-District --</option>
            {subDistricts.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-[var(--border)] overflow-hidden stagger-2">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Server className="w-5 h-5 mr-2 text-primary" />
            Villages Result
          </h2>
          <span className="text-xs font-medium bg-primary/20 text-primary px-3 py-1 rounded-full">
            {villages.length} Found
          </span>
        </div>
        
        <div className="p-0 overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
              <p>Fetching data from backend...</p>
            </div>
          ) : villages.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-black/20">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Village Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Village Code</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">ID</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-emerald-500 mr-2" />
                        <span className="font-medium text-gray-200">{v.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="bg-black/30 px-2 py-1 rounded text-gray-300 font-mono text-sm border border-gray-800">
                        {v.code}
                      </code>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-gray-500 font-mono">
                      {v.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <MapPin className="w-12 h-12 text-gray-700 mb-4" />
                <p>Select a Sub-District to view villages</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
