import { useState, useCallback, useRef, useEffect } from 'react';
import { Database, Search, MapPin, ChevronRight, Loader2, X, Map } from 'lucide-react';
import { searchVillagesFiltered, getStates, getDistricts } from '../services/api';

// API returns {value (id), label (name), fullAddress, hierarchy: {village, villageCode, subDistrict, district, state, country}}
interface Village {
  value: string;           // village UUID  (was wrongly typed as "id")
  label: string;           // village name  (was wrongly typed as "name")
  fullAddress?: string;
  hierarchy?: {
    village?: string;
    villageCode?: string;
    subDistrict?: string;
    district?: string;
    state?: string;
    country?: string;
  };
}

interface State    { id: string; name: string; code: string; }
interface District { id: string; name: string; code: string; }

export const Demo = () => {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Village[]>([]);
  const [selected, setSelected] = useState<Village | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const [states,         setStates]         = useState<State[]>([]);
  const [stateFilter,    setStateFilter]    = useState('');
  const [districts,      setDistricts]      = useState<District[]>([]);
  const [districtFilter, setDistrictFilter] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load states on mount
  useEffect(() => {
    getStates().then(r => setStates(r.data ?? [])).catch(() => {});
  }, []);

  // Load districts when state changes
  useEffect(() => {
    if (!stateFilter) { setDistricts([]); setDistrictFilter(''); return; }
    getDistricts(stateFilter).then(r => setDistricts(r.data ?? [])).catch(() => {});
    setDistrictFilter('');
  }, [stateFilter]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await searchVillagesFiltered({
        q,
        state:    stateFilter    || undefined,
        district: districtFilter || undefined,
        limit:    30,
      });
      setResults(res.data ?? []);
      setSearched(true);
    } catch { setResults([]); }
    finally   { setLoading(false); }
  }, [stateFilter, districtFilter]);

  const handleInput = (val: string) => {
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSelect = (v: Village) => {
    setSelected(v);
    setQuery(v.label);   // ← fixed: was v.name
    setResults([]);
  };

  const clearAll = () => {
    setQuery(''); setResults([]); setSelected(null); setSearched(false);
    setStateFilter(''); setDistrictFilter('');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/8 blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[130px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-[var(--border)] glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Village API
            </span>
            <span className="text-gray-600 mx-2">·</span>
            <span className="text-gray-400 text-sm">Live Demo</span>
          </div>
          <a href="/login"
            className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            Sign in →
          </a>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-5">
            <Map className="w-4 h-4" /> 564,159 villages across India
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Search any village in
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400"> India</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Real-time village search powered by PostgreSQL GIN trigram indexing and Redis caching.
            State → District → Sub-District → Village hierarchy.
          </p>
        </div>

        {/* Filters row */}
        <div className="flex gap-3 mb-3">
          <select value={stateFilter}
            onChange={e => { setStateFilter(e.target.value); setQuery(''); setResults([]); setSelected(null); }}
            className="flex-1 px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">All States</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={districtFilter}
            onChange={e => { setDistrictFilter(e.target.value); setQuery(''); setResults([]); setSelected(null); }}
            disabled={!stateFilter || districts.length === 0}
            className="flex-1 px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40">
            <option value="">All Districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Search box */}
        <div className="relative mb-6">
          <div className="relative">
            {loading
              ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
              : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            }
            <input
              id="demo-search"
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Type a village name (e.g. Khed, Haveli, Rampur)…"
              className="w-full pl-12 pr-12 py-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-xl shadow-black/20"
            />
            {(query || selected) && (
              <button onClick={clearAll}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {results.length > 0 && !selected && (
            <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
              {results.map((v) => (
                <button key={v.value} onClick={() => handleSelect(v)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-[var(--border)] last:border-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium">{v.label}</span>
                    <p className="text-gray-500 text-xs truncate mt-0.5">
                      {[v.hierarchy?.subDistrict, v.hierarchy?.district, v.hierarchy?.state]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
          {searched && results.length === 0 && !loading && query.length >= 2 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl px-6 py-5 text-center text-gray-400 text-sm">
              No villages found for "<span className="text-white">{query}</span>". Try a different spelling.
            </div>
          )}
        </div>

        {/* Selected village detail card */}
        {selected && (
          <div className="glass-card rounded-2xl p-6 border border-primary/20 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white">{selected.label}</h2>
                <p className="text-gray-400 text-sm mt-1">{selected.fullAddress}</p>
              </div>
            </div>

            {/* Hierarchy breadcrumb — hierarchy fields are flat strings */}
            {selected.hierarchy?.state && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  🏛 {selected.hierarchy.state}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  🏙 {selected.hierarchy.district}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  🏘 {selected.hierarchy.subDistrict}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                  📍 {selected.label}
                </span>
              </div>
            )}

            {/* Data fields */}
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Village Code',  value: selected.hierarchy?.villageCode ?? '—' },
                { label: 'Sub-District',  value: selected.hierarchy?.subDistrict ?? '—' },
                { label: 'District',      value: selected.hierarchy?.district    ?? '—' },
                { label: 'State',         value: selected.hierarchy?.state       ?? '—' },
              ].map(f => (
                <div key={f.label} className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                  <p className="font-mono font-semibold text-white text-sm truncate" title={f.value}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* API curl snippet */}
            <div className="mt-5">
              <p className="text-xs text-gray-500 mb-2">API Request</p>
              <div className="bg-black/50 rounded-xl p-3 font-mono text-xs text-gray-300 border border-gray-800 overflow-x-auto">
                <span className="text-emerald-400">GET</span> /v1/geo/villages/{selected.value}<br />
                <span className="text-gray-500">X-API-Key:</span>    <span className="text-amber-300">ak_your_key</span><br />
                <span className="text-gray-500">X-API-Secret:</span> <span className="text-amber-300">as_your_secret</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats footer */}
        {!selected && !searched && (
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: '564,159', label: 'Villages' },
              { value: '37',      label: 'States' },
              { value: '<200ms',  label: 'Cached response' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-5 text-center border border-white/5">
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{s.value}</p>
                <p className="text-gray-500 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
