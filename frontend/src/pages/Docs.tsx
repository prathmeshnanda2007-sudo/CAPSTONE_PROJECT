import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink, Lock, Zap, Search, Database, Shield, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EndpointDef {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  tag: string;
  auth: 'Bearer' | 'ApiKey' | 'None';
  params?: { name: string; in: 'path' | 'query' | 'body'; required?: boolean; type: string; description: string; example?: string }[];
  bodyExample?: string;
  responseExample: string;
  cached?: string;
}

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PATCH:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const ENDPOINTS: EndpointDef[] = [
  // Auth
  {
    id: 'auth-register', method: 'POST', path: '/auth/register', tag: 'Auth',
    summary: 'Register a new business account', auth: 'None',
    params: [
      { name: 'email',        in: 'body', required: true,  type: 'string', description: 'Business email address', example: 'admin@acme.com' },
      { name: 'password',     in: 'body', required: true,  type: 'string', description: 'Min 8 characters', example: 'SecurePass123!' },
      { name: 'businessName', in: 'body', required: true,  type: 'string', description: 'Company name', example: 'Acme Corp' },
      { name: 'phone',        in: 'body', required: false, type: 'string', description: 'Business phone', example: '+91 98765 43210' },
      { name: 'gstNumber',    in: 'body', required: false, type: 'string', description: 'GST number', example: '22AAAAA0000A1Z5' },
    ],
    bodyExample: `{\n  "email": "admin@acme.com",\n  "password": "SecurePass123!",\n  "businessName": "Acme Corp"\n}`,
    responseExample: `{\n  "success": true,\n  "data": {\n    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n    "user": { "id": "cuid...", "email": "admin@acme.com", "planType": "Free", "role": "USER" }\n  }\n}`,
  },
  {
    id: 'auth-login', method: 'POST', path: '/auth/login', tag: 'Auth',
    summary: 'Login and get a JWT', auth: 'None',
    params: [
      { name: 'email',    in: 'body', required: true, type: 'string', description: 'Your email', example: 'admin@acme.com' },
      { name: 'password', in: 'body', required: true, type: 'string', description: 'Your password', example: 'SecurePass123!' },
    ],
    bodyExample: `{\n  "email": "admin@acme.com",\n  "password": "SecurePass123!"\n}`,
    responseExample: `{\n  "success": true,\n  "data": {\n    "token": "eyJhbGci...",\n    "user": { "planType": "Pro", "role": "USER" }\n  }\n}`,
  },
  // Geo
  {
    id: 'geo-states', method: 'GET', path: '/geo/states', tag: 'Geo',
    summary: 'List all states', description: 'Returns all 35+ Indian states. Cached 1 hour in Redis.',
    auth: 'Bearer', cached: '1 hour',
    responseExample: `{\n  "success": true,\n  "count": 35,\n  "data": [\n    { "id": "cuid...", "name": "Maharashtra", "code": "27" },\n    { "id": "cuid...", "name": "Karnataka", "code": "29" }\n  ],\n  "meta": { "requestId": "uuid..." }\n}`,
  },
  {
    id: 'geo-districts', method: 'GET', path: '/geo/states/{stateId}/districts', tag: 'Geo',
    summary: 'List districts in a state', auth: 'Bearer', cached: '1 hour',
    params: [{ name: 'stateId', in: 'path', required: true, type: 'uuid', description: 'State ID from GET /geo/states', example: 'cuid_state_id' }],
    responseExample: `{\n  "success": true,\n  "count": 36,\n  "data": [\n    { "id": "cuid...", "name": "Pune", "code": "230", "stateId": "cuid..." }\n  ]\n}`,
  },
  {
    id: 'geo-subdistricts', method: 'GET', path: '/geo/districts/{districtId}/sub-districts', tag: 'Geo',
    summary: 'List sub-districts in a district', auth: 'Bearer', cached: '30 min',
    params: [{ name: 'districtId', in: 'path', required: true, type: 'uuid', description: 'District ID', example: 'cuid_district_id' }],
    responseExample: `{\n  "success": true,\n  "count": 15,\n  "data": [\n    { "id": "cuid...", "name": "Haveli", "code": "0002" }\n  ]\n}`,
  },
  {
    id: 'geo-villages', method: 'GET', path: '/geo/sub-districts/{subDistrictId}/villages', tag: 'Geo',
    summary: 'List villages in a sub-district (paginated)', auth: 'Bearer', cached: '30 min',
    params: [
      { name: 'subDistrictId', in: 'path',  required: true,  type: 'uuid',    description: 'Sub-district ID' },
      { name: 'page',          in: 'query', required: false, type: 'integer',  description: 'Page number', example: '1' },
      { name: 'limit',         in: 'query', required: false, type: 'integer',  description: 'Results per page (max 500)', example: '100' },
    ],
    responseExample: `{\n  "success": true,\n  "data": [ { "id": "cuid...", "name": "Khed Shivapur", "code": "00123" } ],\n  "meta": { "page": 1, "limit": 100, "total": 245, "totalPages": 3 }\n}`,
  },
  {
    id: 'geo-search', method: 'GET', path: '/geo/villages/search', tag: 'Geo',
    summary: 'Search villages by name', description: 'GIN trigram full-text search. Min 2 chars. Cached 5 min.',
    auth: 'Bearer', cached: '5 min',
    params: [
      { name: 'q',           in: 'query', required: true,  type: 'string',  description: 'Village name (min 2 chars)', example: 'Khed' },
      { name: 'state',       in: 'query', required: false, type: 'uuid',    description: 'Filter by state ID' },
      { name: 'district',    in: 'query', required: false, type: 'uuid',    description: 'Filter by district ID' },
      { name: 'subdistrict', in: 'query', required: false, type: 'uuid',    description: 'Filter by sub-district ID' },
      { name: 'limit',       in: 'query', required: false, type: 'integer', description: 'Max results (default 20, max 100)', example: '20' },
    ],
    responseExample: `{\n  "success": true,\n  "count": 3,\n  "data": [\n    {\n      "id": "cuid...",\n      "name": "Khed Shivapur",\n      "fullAddress": "Khed Shivapur, Haveli, Pune, Maharashtra",\n      "hierarchy": {\n        "state": { "name": "Maharashtra" },\n        "district": { "name": "Pune" },\n        "subDistrict": { "name": "Haveli" }\n      }\n    }\n  ]\n}`,
  },
  {
    id: 'geo-autocomplete', method: 'GET', path: '/geo/villages/autocomplete', tag: 'Geo',
    summary: 'Autocomplete village names', description: 'Optimised for typeahead. Returns name strings only. Cached 5 min.',
    auth: 'Bearer', cached: '5 min',
    params: [
      { name: 'q',     in: 'query', required: true,  type: 'string',  description: 'Partial village name', example: 'Mum' },
      { name: 'limit', in: 'query', required: false, type: 'integer', description: 'Max suggestions (default 10, max 20)', example: '10' },
    ],
    responseExample: `{\n  "success": true,\n  "data": ["Mumbai", "Mumbra", "Mumulwadi"]\n}`,
  },
  {
    id: 'geo-village-id', method: 'GET', path: '/geo/villages/{id}', tag: 'Geo',
    summary: 'Get a village by ID', description: 'Returns full hierarchy. Cached 30 min.',
    auth: 'Bearer', cached: '30 min',
    params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'Village ID', example: 'cuid_village_id' }],
    responseExample: `{\n  "success": true,\n  "data": {\n    "id": "cuid...",\n    "name": "Khed Shivapur",\n    "code": "00123",\n    "fullAddress": "Khed Shivapur, Haveli, Pune, Maharashtra",\n    "hierarchy": {\n      "state": { "name": "Maharashtra", "code": "27" },\n      "district": { "name": "Pune", "code": "230" },\n      "subDistrict": { "name": "Haveli", "code": "0002" }\n    }\n  }\n}`,
  },
  // Keys
  {
    id: 'keys-list', method: 'GET', path: '/keys', tag: 'API Keys',
    summary: 'List your API keys', auth: 'Bearer',
    responseExample: `{\n  "success": true,\n  "data": [\n    { "id": "cuid...", "name": "Production", "key": "ak_xxx", "status": "Active", "lastUsed": "2026-05-19" }\n  ]\n}`,
  },
  {
    id: 'keys-create', method: 'POST', path: '/keys', tag: 'API Keys',
    summary: 'Create a new API key', description: '⚠️ The secret is only returned once. Store it securely.',
    auth: 'Bearer',
    params: [{ name: 'name', in: 'body', required: true, type: 'string', description: 'Descriptive name', example: 'Production Key' }],
    bodyExample: `{\n  "name": "Production Key"\n}`,
    responseExample: `{\n  "success": true,\n  "data": {\n    "key":    "ak_a1b2c3d4e5f6...",\n    "secret": "as_z9y8x7w6v5u4...",\n    "name":   "Production Key"\n  }\n}`,
  },
  {
    id: 'keys-revoke', method: 'PATCH', path: '/keys/{id}/revoke', tag: 'API Keys',
    summary: 'Revoke a key', auth: 'Bearer',
    params: [{ name: 'id', in: 'path', required: true, type: 'uuid', description: 'API key ID' }],
    responseExample: `{\n  "success": true,\n  "data": { "id": "cuid...", "status": "Revoked" }\n}`,
  },
];

const TAGS = ['Auth', 'Geo', 'API Keys'];

// ─── Sub-components ───────────────────────────────────────────────────────────
const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-black/60 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto border border-gray-800 leading-relaxed">
        {code}
      </pre>
      <button onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700/50 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white transition-all">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

const EndpointCard = ({ ep }: { ep: EndpointDef }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card rounded-xl border border-[var(--border)] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors text-left">
        <span className={`text-xs font-bold px-2.5 py-1 rounded border shrink-0 ${METHOD_COLOR[ep.method]}`}>
          {ep.method}
        </span>
        <code className="font-mono text-gray-200 text-sm flex-1">/v1{ep.path}</code>
        <span className="text-gray-400 text-sm hidden md:block">{ep.summary}</span>
        <div className="flex items-center gap-2 shrink-0">
          {ep.cached && (
            <span className="text-xs flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />{ep.cached}
            </span>
          )}
          {ep.auth !== 'None' && <Lock className="w-4 h-4 text-amber-400" />}
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-5 space-y-5 bg-black/10">
          {ep.description && <p className="text-gray-400 text-sm">{ep.description}</p>}

          {/* Auth badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Auth:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ep.auth === 'None' ? 'bg-gray-500/10 text-gray-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {ep.auth === 'Bearer' ? 'JWT Bearer Token' : ep.auth === 'ApiKey' ? 'X-API-Key + X-API-Secret' : 'None'}
            </span>
          </div>

          {/* Parameters */}
          {ep.params && ep.params.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Parameters</h4>
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-white/5 border-b border-[var(--border)]">
                    <th className="text-left text-gray-400 px-3 py-2">Name</th>
                    <th className="text-left text-gray-400 px-3 py-2">In</th>
                    <th className="text-left text-gray-400 px-3 py-2">Type</th>
                    <th className="text-left text-gray-400 px-3 py-2">Required</th>
                    <th className="text-left text-gray-400 px-3 py-2">Description</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {ep.params.map(p => (
                      <tr key={p.name}>
                        <td className="px-3 py-2 font-mono text-blue-300">{p.name}</td>
                        <td className="px-3 py-2 text-gray-400">{p.in}</td>
                        <td className="px-3 py-2 text-gray-400">{p.type}</td>
                        <td className="px-3 py-2">{p.required ? <span className="text-red-400">required</span> : <span className="text-gray-500">optional</span>}</td>
                        <td className="px-3 py-2 text-gray-400">{p.description}{p.example && <span className="text-gray-500 ml-1">e.g. <code>{p.example}</code></span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request body */}
          {ep.bodyExample && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Request Body</h4>
              <CodeBlock code={ep.bodyExample} />
            </div>
          )}

          {/* Response */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Response <span className="text-emerald-400 font-mono text-xs">200 OK</span></h4>
            <CodeBlock code={ep.responseExample} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Docs Page ───────────────────────────────────────────────────────────
export const Docs = () => {
  const [activeTag, setActiveTag] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = ENDPOINTS.filter(ep => {
    const tagMatch = activeTag === 'All' || ep.tag === activeTag;
    const searchMatch = !search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.summary.toLowerCase().includes(search.toLowerCase());
    return tagMatch && searchMatch;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight mb-2">
              API Reference
            </h1>
            <p className="text-gray-400">
              Complete reference for all Village API endpoints — 564,159 villages, 35+ states, sub-100ms cached responses.
            </p>
          </div>
          <a href="http://localhost:3000/api-docs" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors shrink-0">
            <ExternalLink className="w-4 h-4" /> Swagger UI
          </a>
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { icon: Database, label: '564,159 villages' },
          { icon: Zap,      label: '<200ms cached' },
          { icon: Shield,   label: 'API Key + JWT auth' },
          { icon: Search,   label: 'GIN trigram search' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
            <Icon className="w-4 h-4 text-primary" />{label}
          </div>
        ))}
      </div>

      {/* Base URL + Auth cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Base URL</p>
          <code className="text-emerald-400 font-mono text-sm">http://localhost:3000/v1</code>
          <p className="text-xs text-gray-500 mt-1">(production: https://api.villageplatform.in/v1)</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Authentication</p>
          <div className="space-y-1 text-xs font-mono">
            <div><span className="text-gray-500">Dashboard: </span><span className="text-blue-300">Authorization: Bearer &lt;token&gt;</span></div>
            <div><span className="text-gray-500">B2B API:   </span><span className="text-amber-300">X-API-Key + X-API-Secret</span></div>
          </div>
        </div>
      </div>

      {/* Rate limit table */}
      <div className="glass-card rounded-xl p-5 mb-8 border border-[var(--border)]">
        <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Rate Limits
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead><tr className="border-b border-[var(--border)]">
              {['Plan','Daily Quota','Burst (per min)','X-RateLimit-Plan'].map(h => (
                <th key={h} className="pb-2 pr-6 text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { plan: 'Free',      daily: '5,000',     burst: '100',   tag: 'Free' },
                { plan: 'Premium',   daily: '50,000',    burst: '500',   tag: 'Premium' },
                { plan: 'Pro',       daily: '300,000',   burst: '2,000', tag: 'Pro' },
                { plan: 'Unlimited', daily: '1,000,000', burst: '5,000', tag: 'Unlimited' },
              ].map(r => (
                <tr key={r.plan}>
                  <td className="py-2 pr-6 text-gray-200 font-medium">{r.plan}</td>
                  <td className="py-2 pr-6 text-gray-300">{r.daily}</td>
                  <td className="py-2 pr-6 text-gray-300">{r.burst}</td>
                  <td className="py-2 font-mono text-primary">{r.tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search endpoints…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2">
          {['All', ...TAGS].map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTag === tag ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-[var(--input)] border border-[var(--border)] text-gray-400 hover:text-gray-200'
              }`}>{tag}</button>
          ))}
        </div>
      </div>

      {/* Endpoint list grouped by tag */}
      {(activeTag === 'All' ? TAGS : [activeTag]).map(tag => {
        const eps = filtered.filter(e => e.tag === tag);
        if (eps.length === 0) return null;
        return (
          <div key={tag} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {tag}
            </h2>
            <div className="space-y-3">
              {eps.map(ep => <EndpointCard key={ep.id} ep={ep} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
