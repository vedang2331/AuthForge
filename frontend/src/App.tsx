import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  Activity,
  Server,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Radio,
  Terminal,
  Cpu,
  Layers
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyIdentifier: string;
  permissions: string[];
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
}

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { email: string };
  metadata?: any;
}

interface GatewayRouteItem {
  id: string;
  pathPrefix: string;
  targetUrl: string;
  requireAuth: boolean;
  requiredPermissions: string[];
  rateLimitRequests: number;
  rateLimitWindowSeconds: number;
  isActive: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sessions' | 'apikeys' | 'audit' | 'gateway'>('overview');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Login form state
  const [email, setEmail] = useState('admin@authforge.io');
  const [password, setPassword] = useState('Admin@123456');
  const [loginError, setLoginError] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Data states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<SessionItem[]>([]);
  const [apiKeysList, setApiKeysList] = useState<ApiKeyItem[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>([]);
  const [gatewayRoutesList, setGatewayRoutesList] = useState<GatewayRouteItem[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Modal / Form state for API Key creation
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['PROJECT_READ']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Gateway Simulator State
  const [simPath, setSimPath] = useState('/gateway/projects');
  const [simResult, setSimResult] = useState<any>(null);

  // Initial Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setIsLoggedIn(true);
      } else {
        setLoginError(data.error?.message || 'Login failed');
      }
    } catch {
      setLoginError('Cannot connect to AuthForge backend');
    }
  };

  const fetchDashboardData = async () => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const [uRes, sRes, kRes, aRes, gRes, hRes] = await Promise.all([
        fetch('/api/v1/users', { headers }),
        fetch('/api/v1/sessions', { headers }),
        fetch('/api/v1/api-keys', { headers }),
        fetch('/api/v1/audit-logs', { headers }),
        fetch('/api/v1/gateway-routes', { headers }),
        fetch('/ready'),
      ]);

      if (uRes.ok) setUsersList((await uRes.json()).data || []);
      if (sRes.ok) setSessionsList((await sRes.json()).data || []);
      if (kRes.ok) setApiKeysList((await kRes.json()).data || []);
      if (aRes.ok) setAuditLogsList((await aRes.json()).data || []);
      if (gRes.ok) setGatewayRoutesList((await gRes.json()).data || []);
      if (hRes.ok) setHealthStatus(await hRes.json());
    } catch (err) {
      console.error('Failed fetching admin data', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchDashboardData();
    }
  }, [isLoggedIn, activeTab]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: selectedPerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedSecret(data.data.secret);
        setNewKeyName('');
        fetchDashboardData();
      }
    } catch (err) {
      console.error('API key creation failed', err);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    await fetch(`/api/v1/api-keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    fetchDashboardData();
  };

  const handleRevokeSession = async (id: string) => {
    await fetch(`/api/v1/sessions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    fetchDashboardData();
  };

  const handleSimulateGateway = async () => {
    try {
      const res = await fetch(simPath, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      setSimResult({ status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json });
    } catch (err: any) {
      setSimResult({ error: err.message });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#090d16] via-[#0b0f19] to-[#111827]">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">AuthForge Platform</h1>
              <p className="text-xs text-slate-400">Production IAM & API Gateway Dashboard</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              Sign In to Platform
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Demo Credentials: <span className="text-indigo-400 font-mono">admin@authforge.io</span> / <span className="text-indigo-400 font-mono">Admin@123456</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19]">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 glass-card sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">AuthForge <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 ml-1">Admin Console</span></span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={fetchDashboardData} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Refresh Data">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.firstName?.[0] || 'A'}
            </div>
            <span className="text-slate-200 font-medium text-xs hidden sm:inline">{user?.email}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">{user?.role}</span>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors ml-2" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-white/10 bg-[#090d16]/80 p-4 flex flex-col gap-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">Management</div>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Activity className="w-4 h-4" /> System Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Users className="w-4 h-4" /> Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'sessions' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Cpu className="w-4 h-4" /> Active Sessions
          </button>
          <button
            onClick={() => setActiveTab('apikeys')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'apikeys' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Key className="w-4 h-4" /> API Keys
          </button>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2 mt-4">Security & Gateway</div>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Lock className="w-4 h-4" /> Security Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'gateway' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
          >
            <Server className="w-4 h-4" /> API Gateway Router
          </button>
        </aside>

        {/* Workspace Content Area */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Platform Health & Key Metrics</h2>
                <p className="text-xs text-slate-400">Live operational state of PostgreSQL, Redis, rate limiting, and security engines.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Database & Cache Status</span>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{healthStatus?.data?.status || 'HEALTHY'}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">PG & Redis connected</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Registered Users</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{usersList.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">SuperAdmin, Admin, Devs, Users</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Active Sessions</span>
                    <Cpu className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{sessionsList.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Tracked in Redis & Postgres</div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Active API Keys</span>
                    <Key className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-extrabold text-white">{apiKeysList.length}</div>
                  <div className="text-[11px] text-amber-400 mt-1">Hashed HMAC-SHA256</div>
                </div>
              </div>

              {/* Architecture Highlight Box */}
              <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <Layers className="w-5 h-5" /> AuthForge Architecture Highlights
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white text-sm">Refresh Token Rotation</div>
                    <p className="text-slate-400">Cryptographically secure 256-bit token family rotation with instant token breach detection & session revocation.</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white text-sm">Fine-Grained RBAC</div>
                    <p className="text-slate-400">Atomic permissions mapping (<code className="text-indigo-300">USER_READ</code>, <code className="text-indigo-300">API_MANAGE</code>) checked decoupled via middleware.</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white text-sm">Redis Sliding Window</div>
                    <p className="text-slate-400">Multi-tier rate limiting for login attempts (5/min), API endpoints (100/min), and API key requests with 429 headers.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Registered Users</h2>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-medium text-white">{u.email}</td>
                        <td className="p-3.5">{u.firstName} {u.lastName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold text-[10px] border border-indigo-500/30">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Active Device Sessions</h2>
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Device Type</th>
                      <th className="p-3.5">IP Address</th>
                      <th className="p-3.5">Last Active</th>
                      <th className="p-3.5">User Agent</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sessionsList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-white flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-indigo-400" />
                          {s.deviceType} {s.isCurrent && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">Current</span>}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">{s.ipAddress}</td>
                        <td className="p-3.5 text-slate-400">{new Date(s.lastActiveAt).toLocaleString()}</td>
                        <td className="p-3.5 text-slate-400 truncate max-w-xs">{s.userAgent}</td>
                        <td className="p-3.5 text-right">
                          {!s.isCurrent && (
                            <button
                              onClick={() => handleRevokeSession(s.id)}
                              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[11px] font-semibold border border-red-500/30"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API KEYS TAB */}
          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">API Keys Management</h2>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" /> Generate New API Key
                </button>
              </div>

              {createdSecret && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> Save your API Key Secret Now!
                  </div>
                  <p className="text-slate-300">This key secret will NEVER be displayed again. Store it securely in your client application.</p>
                  <div className="p-2.5 bg-slate-950 font-mono text-emerald-400 text-sm rounded-xl border border-slate-800 select-all overflow-x-auto">
                    {createdSecret}
                  </div>
                </div>
              )}

              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Key Name</th>
                      <th className="p-3.5">Identifier</th>
                      <th className="p-3.5">Permissions</th>
                      <th className="p-3.5">Created At</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {apiKeysList.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-semibold text-white">{k.name}</td>
                        <td className="p-3.5 font-mono text-indigo-400">{k.keyIdentifier}</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {k.permissions.map((p) => (
                              <span key={p} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 font-mono">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleRevokeApiKey(k.id)}
                            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-[11px] font-semibold border border-red-500/30"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* API Key Modal */}
              {showKeyModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-card rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
                    <h3 className="text-lg font-bold text-white">Generate API Key</h3>
                    <form onSubmit={handleCreateApiKey} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Key Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g. DevFlow Service Key"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Permission Scopes</label>
                        <div className="space-y-1 text-xs">
                          {['PROJECT_READ', 'PROJECT_WRITE', 'USER_READ', 'API_MANAGE'].map((perm) => (
                            <label key={perm} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPerms.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedPerms([...selectedPerms, perm]);
                                  else setSelectedPerms(selectedPerms.filter((p) => p !== perm));
                                }}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                              />
                              {perm}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowKeyModal(false)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                        >
                          Create Secret Key
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Security Audit Log Trail</h2>
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Action Event</th>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">IP Address</th>
                      <th className="p-3.5">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {auditLogsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3.5 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.action.includes('FAILED') || log.action.includes('REUSE') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-sans text-white">{log.user?.email || 'System'}</td>
                        <td className="p-3.5 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                        <td className="p-3.5 text-[11px] text-slate-400 max-w-xs truncate">{JSON.stringify(log.metadata || {})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GATEWAY TAB */}
          {activeTab === 'gateway' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">API Gateway Dynamic Routes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gatewayRoutesList.map((route) => (
                    <div key={route.id} className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-indigo-400">{route.pathPrefix}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          FORWARDING
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1 font-mono">
                        <div>Target: <span className="text-slate-100">{route.targetUrl}</span></div>
                        <div>Required Auth: <span className="text-indigo-300">{route.requireAuth ? 'YES (JWT/ApiKey)' : 'NO'}</span></div>
                        <div>Required Perms: <span className="text-amber-300">[{route.requiredPermissions.join(', ')}]</span></div>
                        <div>Rate Limit: <span className="text-emerald-300">{route.rateLimitRequests} req / {route.rateLimitWindowSeconds}s</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gateway Live Request Simulator */}
              <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Terminal className="w-5 h-5 text-indigo-400" /> Gateway Request Simulator
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    value={simPath}
                    onChange={(e) => setSimPath(e.target.value)}
                  />
                  <button
                    onClick={handleSimulateGateway}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Send Forwarded Request
                  </button>
                </div>

                {simResult && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono overflow-x-auto">
                    <div className="text-slate-400">Response Status: <span className="text-emerald-400 font-bold">{simResult.status}</span></div>
                    <pre className="text-indigo-300 text-[11px]">{JSON.stringify(simResult.body, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
