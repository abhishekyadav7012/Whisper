"use client"
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'whisper_admin_jwt';

type Tab = 'dashboard' | 'users' | 'posts' | 'rooms' | 'messages' | 'collabs' | 'communities' | 'notifications' | 'settings';

const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const ago = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const NOTIF_ICONS: Record<string, string> = {
  message: '💬', room_message: '🏠', community_post: '🌐',
  community_join_request: '🔔', community_join_approved: '✅',
  community_join_rejected: '❌', like: '❤️', comment: '💭', default: '📌'
};

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedConvo, setSelectedConvo] = useState<{ u1: string; u2: string } | null>(null);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [expandedPost, setExpandedPost] = useState<any>(null);
  const [expandedCommunity, setExpandedCommunity] = useState<any>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; action: () => void } | null>(null);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) return;
    fetch(`${API}/api/admin/verify`, { headers: { 'Authorization': `Bearer ${saved}` } })
      .then(r => { if (r.ok) setToken(saved); else localStorage.removeItem(TOKEN_KEY); })
      .catch(() => localStorage.removeItem(TOKEN_KEY));
  }, []);

  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch(`${API}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (r.ok) { const d = await r.json(); localStorage.setItem(TOKEN_KEY, d.token); setToken(d.token); }
      else { const d = await r.json(); setLoginError(d.msg || 'Wrong password'); }
    } catch { setLoginError('Cannot reach server'); }
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async (t: Tab) => {
    if (t === 'settings') return;
    setLoading(true); setSearch('');
    try {
      const h = authHeaders();
      if (t === 'dashboard') { const r = await fetch(`${API}/api/admin/stats`, { headers: h }); setStats(await r.json()); }
      else if (t === 'users') { const r = await fetch(`${API}/api/admin/users`, { headers: h }); setUsers(await r.json()); }
      else if (t === 'posts') { const r = await fetch(`${API}/api/admin/thoughts`, { headers: h }); setPosts(await r.json()); }
      else if (t === 'rooms') { const r = await fetch(`${API}/api/admin/rooms`, { headers: h }); setRooms(await r.json()); }
      else if (t === 'messages') { const r = await fetch(`${API}/api/admin/messages`, { headers: h }); setMessages(await r.json()); }
      else if (t === 'collabs') { const r = await fetch(`${API}/api/admin/collabs`, { headers: h }); setCollabs(await r.json()); }
      else if (t === 'communities') { const r = await fetch(`${API}/api/admin/communities`, { headers: h }); setCommunities(await r.json()); }
      else if (t === 'notifications') { const r = await fetch(`${API}/api/admin/notifications`, { headers: h }); setNotifications(await r.json()); }
    } catch { showToast('Failed to load data', 'err'); }
    setLoading(false);
  };

  useEffect(() => { if (token) load(tab); }, [tab, token]);

  const askConfirm = (msg: string, action: () => void) => setConfirm({ msg, action });

  const delUser = (username: string) => askConfirm(`Permanently delete @${username} and ALL their data?`, async () => {
    const r = await fetch(`${API}/api/admin/users/${username}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast(`@${username} deleted`); setUsers(u => u.filter(x => x.username !== username)); }
    else showToast('Delete failed', 'err');
  });

  const delPost = (id: string) => askConfirm('Delete this post permanently?', async () => {
    const r = await fetch(`${API}/api/admin/thoughts/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Post deleted'); setPosts(p => p.filter(x => x._id !== id)); setExpandedPost(null); }
    else showToast('Delete failed', 'err');
  });

  const delRoom = (id: string) => askConfirm('Delete this room and ALL messages?', async () => {
    const r = await fetch(`${API}/api/admin/rooms/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Room deleted'); setRooms(p => p.filter(x => x._id !== id)); setSelectedRoom(null); }
    else showToast('Delete failed', 'err');
  });

  const delRoomMsg = async (roomId: string, msgId: string) => {
    const r = await fetch(`${API}/api/admin/rooms/${roomId}/messages/${msgId}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Message removed'); setSelectedRoom((rm: any) => rm ? { ...rm, messages: rm.messages.filter((m: any) => m.id !== msgId) } : rm); }
    else showToast('Delete failed', 'err');
  };

  const delMessage = (id: string) => askConfirm('Delete this private message?', async () => {
    const r = await fetch(`${API}/api/admin/messages/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Message deleted'); setMessages(m => m.filter(x => x._id !== id)); setConvoMessages(m => m.filter(x => x._id !== id)); }
    else showToast('Delete failed', 'err');
  });

  const delCollab = (id: string) => askConfirm('Delete this collab project?', async () => {
    const r = await fetch(`${API}/api/admin/collabs/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Collab deleted'); setCollabs(c => c.filter(x => x._id !== id)); }
    else showToast('Delete failed', 'err');
  });

  const delCommunity = (id: string) => askConfirm('Delete this community and ALL its data?', async () => {
    const r = await fetch(`${API}/api/admin/communities/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Community deleted'); setCommunities(c => c.filter(x => x._id !== id)); setExpandedCommunity(null); }
    else showToast('Delete failed', 'err');
  });

  const delCommunityPost = async (communityId: string, postId: string) => {
    const r = await fetch(`${API}/api/admin/communities/${communityId}/posts/${postId}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast('Post deleted'); setExpandedCommunity((c: any) => c ? { ...c, posts: c.posts.filter((p: any) => p._id !== postId) } : c); }
    else showToast('Delete failed', 'err');
  };

  const removeMember = async (communityId: string, username: string) => {
    const r = await fetch(`${API}/api/admin/communities/${communityId}/members/${username}`, { method: 'DELETE', headers: authHeaders() });
    if (r.ok) { showToast(`@${username} removed`); setExpandedCommunity((c: any) => c ? { ...c, members: c.members.filter((m: any) => m.username !== username) } : c); }
    else showToast('Remove failed', 'err');
  };

  const approveJoinRequest = async (communityId: string, username: string) => {
    const r = await fetch(`${API}/api/admin/communities/${communityId}/join-requests/${username}/approve`, { method: 'POST', headers: authHeaders() });
    if (r.ok) {
      showToast(`@${username} approved`);
      setExpandedCommunity((c: any) => c ? {
        ...c,
        joinRequests: c.joinRequests.map((r: any) => r.username === username ? { ...r, status: 'approved' } : r),
        members: [...(c.members || []), { username }]
      } : c);
    } else showToast('Approve failed', 'err');
  };

  const rejectJoinRequest = async (communityId: string, username: string) => {
    const r = await fetch(`${API}/api/admin/communities/${communityId}/join-requests/${username}/reject`, { method: 'POST', headers: authHeaders() });
    if (r.ok) { showToast(`@${username} rejected`); setExpandedCommunity((c: any) => c ? { ...c, joinRequests: c.joinRequests.map((r: any) => r.username === username ? { ...r, status: 'rejected' } : r) } : c); }
    else showToast('Reject failed', 'err');
  };

  const openConvo = async (u1: string, u2: string) => {
    setSelectedConvo({ u1, u2 });
    const r = await fetch(`${API}/api/admin/messages/${u1}/${u2}`, { headers: authHeaders() });
    setConvoMessages(await r.json());
  };

  const changePassword = async () => {
    setPwError(''); setPwSuccess(''); setPwLoading(true);
    if (!pwForm.current || !pwForm.next) { setPwError('All fields are required'); setPwLoading(false); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); setPwLoading(false); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords don't match"); setPwLoading(false); return; }
    try {
      const r = await fetch(`${API}/api/admin/change-password`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next })
      });
      const d = await r.json();
      if (r.ok) { setPwSuccess('Password changed! Logging out in 3s...'); setPwForm({ current: '', next: '', confirm: '' }); setTimeout(logout, 3000); }
      else setPwError(d.msg || 'Failed');
    } catch { setPwError('Server error'); }
    setPwLoading(false);
  };

  const getConvos = () => {
    const seen = new Set<string>();
    const convos: { u1: string; u2: string; last: any }[] = [];
    messages.forEach(m => {
      const key = [m.sender, m.receiver].sort().join('|');
      if (!seen.has(key)) { seen.add(key); convos.push({ u1: m.sender, u2: m.receiver, last: m }); }
    });
    return convos;
  };

  const fUsers = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const fPosts = posts.filter(p => (p.content || '').toLowerCase().includes(search.toLowerCase()) || (p.username || '').toLowerCase().includes(search.toLowerCase()));
  const fRooms = rooms.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
  const fCollabs = collabs.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.admin?.toLowerCase().includes(search.toLowerCase()));
  const fConvos = getConvos().filter(c => c.u1.toLowerCase().includes(search.toLowerCase()) || c.u2.toLowerCase().includes(search.toLowerCase()));
  const fCommunities = communities.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.topic?.toLowerCase().includes(search.toLowerCase()));
  const fNotifications = notifications.filter(n => (n.title || '').toLowerCase().includes(search.toLowerCase()) || (n.recipient || '').toLowerCase().includes(search.toLowerCase()));

  const pendingJoinRequests = communities.reduce((acc, c) => acc + (c.joinRequests?.filter((r: any) => r.status === 'pending').length || 0), 0);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const NAV: { id: Tab; icon: string; label: string; count?: number; alert?: boolean }[] = [
    { id: 'dashboard', icon: '◈', label: 'Overview' },
    { id: 'users', icon: '⬡', label: 'Users', count: users.length },
    { id: 'posts', icon: '◉', label: 'Posts', count: posts.length },
    { id: 'rooms', icon: '⬟', label: 'Rooms', count: rooms.length },
    { id: 'messages', icon: '◎', label: 'Messages', count: messages.length },
    { id: 'collabs', icon: '⬢', label: 'Collabs', count: collabs.length },
    { id: 'communities', icon: '◐', label: 'Communities', count: communities.length, alert: pendingJoinRequests > 0 },
    { id: 'notifications', icon: '◆', label: 'Notifications', count: notifications.length, alert: unreadNotifications > 0 },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ];

  // ═══ LOGIN ═══
  if (!token) return (
    <div style={{ minHeight: '100vh', background: '#000005', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#000005;overflow:hidden;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes glitch{0%{transform:none;clip-path:none}2%{transform:skewX(-2deg);clip-path:inset(20% 0 40% 0)}4%{transform:none;clip-path:none}96%{transform:none;clip-path:none}98%{transform:skewX(1deg);clip-path:inset(60% 0 10% 0)}100%{transform:none;clip-path:none}}
        @keyframes scanline{0%{top:-10%}100%{top:110%}}
        @keyframes pulse-border{0%,100%{box-shadow:0 0 20px rgba(255,0,60,0.3),inset 0 0 20px rgba(255,0,60,0.05)}50%{box-shadow:0 0 40px rgba(255,0,60,0.6),inset 0 0 30px rgba(255,0,60,0.1)}}
        @keyframes matrix-rain{0%{opacity:0;transform:translateY(-20px)}50%{opacity:1}100%{opacity:0;transform:translateY(20px)}}
        @keyframes flicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1}20%,22%,24%,55%{opacity:0.4}}
        .cursor{animation:blink 1s step-end infinite;}
        .glitch-text{animation:glitch 4s infinite;}
        .scanline-el{animation:scanline 3s linear infinite;position:absolute;left:0;right:0;height:3px;background:linear-gradient(transparent,rgba(255,0,60,0.15),transparent);pointer-events:none;}
        .pulse-card{animation:pulse-border 3s ease-in-out infinite;}
        .flicker{animation:flicker 5s infinite;}
      `}</style>

      {/* Matrix rain background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, left: `${i * 5}%`, width: 1, height: '100%',
            background: `linear-gradient(to bottom, transparent, rgba(255,0,60,0.${Math.floor(Math.random() * 3) + 1}), transparent)`,
            animation: `matrix-rain ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,0,60,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="scanline-el" />

      <div className="pulse-card" style={{
        width: 440, border: '1px solid rgba(255,0,60,0.4)', borderRadius: 4,
        background: 'rgba(5,0,10,0.95)', overflow: 'hidden', position: 'relative', zIndex: 10,
        backdropFilter: 'blur(20px)'
      }}>
        {/* Top bar */}
        <div style={{ background: 'rgba(255,0,60,0.08)', borderBottom: '1px solid rgba(255,0,60,0.3)', padding: '8px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />)}
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: '#ff003c', marginLeft: 8, letterSpacing: 2 }}>TERMINAL — WHISPER.IO ADMIN</span>
        </div>

        <div style={{ padding: '36px 40px', fontFamily: "'Share Tech Mono', monospace" }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="glitch-text flicker" style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color: '#ff003c', letterSpacing: 6, textShadow: '0 0 30px rgba(255,0,60,0.8), 0 0 60px rgba(255,0,60,0.4)' }}>
              WHISPER
            </div>
            <div style={{ color: 'rgba(255,0,60,0.6)', fontSize: 10, letterSpacing: 8, marginTop: 4 }}>ADMIN CONTROL CENTER</div>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, #ff003c, transparent)', margin: '12px auto 0' }} />
          </div>

          <div style={{ color: '#ff003c', fontSize: 9, letterSpacing: 3, marginBottom: 8, opacity: 0.7 }}>// AUTHENTICATION REQUIRED</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1, marginBottom: 20 }}>ENTER ADMIN PASSWORD TO PROCEED →</div>

          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#ff003c', fontFamily: "'Share Tech Mono', monospace", fontSize: 14 }}>▸</span>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••••••" autoFocus
              style={{
                width: '100%', background: 'rgba(255,0,60,0.05)', border: '1px solid rgba(255,0,60,0.3)',
                borderRadius: 3, padding: '13px 14px 13px 36px', color: '#fff',
                fontFamily: "'Share Tech Mono', monospace", fontSize: 15, outline: 'none', letterSpacing: 4,
                transition: 'all 0.3s', caretColor: '#ff003c'
              }}
              onFocus={e => { e.target.style.borderColor = '#ff003c'; e.target.style.boxShadow = '0 0 20px rgba(255,0,60,0.2)'; e.target.style.background = 'rgba(255,0,60,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,0,60,0.3)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,0,60,0.05)'; }}
            />
          </div>

          {loginError && (
            <div style={{ color: '#ff003c', fontSize: 10, fontFamily: "'Share Tech Mono', monospace", marginBottom: 12, padding: '8px 12px', background: 'rgba(255,0,60,0.08)', border: '1px solid rgba(255,0,60,0.3)', borderRadius: 3 }}>
              ⚠ ERROR: {loginError.toUpperCase()}
            </div>
          )}

          <button onClick={login} style={{
            width: '100%', marginTop: 20, padding: '14px 0',
            background: 'transparent', border: '1px solid #ff003c', color: '#ff003c',
            fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700,
            letterSpacing: 4, textTransform: 'uppercase', cursor: 'pointer',
            borderRadius: 3, transition: 'all 0.3s',
            textShadow: '0 0 10px rgba(255,0,60,0.5)'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ff003c'; e.currentTarget.style.color = '#000'; e.currentTarget.style.textShadow = 'none'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,60,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff003c'; e.currentTarget.style.textShadow = '0 0 10px rgba(255,0,60,0.5)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            AUTHENTICATE<span className="cursor">_</span>
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,0,60,0.2)', padding: '10px 40px', background: 'rgba(255,0,60,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,0,60,0.3)', fontSize: 9, letterSpacing: 2 }}>JWT • 8H SESSION • AES-256</span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: 'rgba(255,0,60,0.3)', fontSize: 9 }}>v3.0.0</span>
        </div>
      </div>
    </div>
  );

  // ═══ MAIN PANEL ═══
  return (
    <div style={{ minHeight: '100vh', background: '#020008', display: 'flex', fontFamily: "'Share Tech Mono', 'Courier New', monospace", color: '#b0b0c0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:#050015;}
        ::-webkit-scrollbar-thumb{background:#ff003c44;border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:#ff003c88;}
        .row-hover:hover{background:rgba(255,0,60,0.04)!important;}
        .del-btn{opacity:0;transition:opacity 0.15s;}
        tr:hover .del-btn,.card-item:hover .del-btn{opacity:1;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.7}}
        @keyframes scanline-move{0%{top:-5%}100%{top:105%}}
        .fade-in{animation:fadeIn 0.3s ease;}
        .slide-in{animation:slideIn 0.25s ease;}
        .pulse-dot{animation:pulse-dot 2s ease-in-out infinite;}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:2px;font-size:9px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;}
        .tag-blue{background:rgba(0,150,255,0.1);color:#0096ff;border:1px solid rgba(0,150,255,0.25);}
        .tag-green{background:rgba(0,255,120,0.08);color:#00ff78;border:1px solid rgba(0,255,120,0.2);}
        .tag-red{background:rgba(255,0,60,0.1);color:#ff003c;border:1px solid rgba(255,0,60,0.25);}
        .tag-yellow{background:rgba(255,200,0,0.1);color:#ffc800;border:1px solid rgba(255,200,0,0.25);}
        .tag-purple{background:rgba(180,0,255,0.1);color:#b400ff;border:1px solid rgba(180,0,255,0.25);}
        .tag-cyan{background:rgba(0,255,255,0.08);color:#00ffff;border:1px solid rgba(0,255,255,0.2);}
        .stat-card{border:1px solid #120030;border-radius:4px;padding:20px 24px;background:#050015;transition:all 0.3s;position:relative;overflow:hidden;}
        .stat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,0,60,0.03) 0%,transparent 60%);pointer-events:none;}
        .stat-card:hover{border-color:rgba(255,0,60,0.3);box-shadow:0 0 30px rgba(255,0,60,0.08);}
        input,textarea,select{outline:none;}
        button{cursor:pointer;}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:3px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;border:none;background:transparent;color:#444;cursor:pointer;transition:all 0.2s;width:100%;text-align:left;border-left:2px solid transparent;}
        .nav-item:hover{color:#888;background:rgba(255,0,60,0.04);border-left-color:rgba(255,0,60,0.3);}
        .nav-item.active{color:#ff003c;background:rgba(255,0,60,0.08);border-left-color:#ff003c;text-shadow:0 0 10px rgba(255,0,60,0.5);}
        .data-table{width:100%;border-collapse:collapse;}
        .data-table th{text-align:left;font-size:8px;letter-spacing:2.5px;color:#333;text-transform:uppercase;padding:12px 14px;border-bottom:1px solid #0f0020;}
        .data-table td{padding:12px 14px;border-bottom:1px solid #080018;font-size:11px;vertical-align:middle;}
        .search-box{background:#050015;border:1px solid #1a0035;border-radius:3px;padding:10px 14px 10px 38px;color:#b0b0c0;font-family:inherit;font-size:11px;width:300px;letter-spacing:0.5px;transition:all 0.2s;}
        .search-box:focus{border-color:rgba(255,0,60,0.4);box-shadow:0 0 15px rgba(255,0,60,0.08);}
        .search-box::placeholder{color:#2a2a4a;}
        .action-btn{padding:4px 12px;border-radius:2px;font-family:inherit;font-size:9px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border:1px solid;transition:all 0.15s;}
        .btn-danger{color:#ff003c;border-color:rgba(255,0,60,0.3);background:rgba(255,0,60,0.05);}
        .btn-danger:hover{background:rgba(255,0,60,0.15);border-color:#ff003c;box-shadow:0 0 10px rgba(255,0,60,0.2);}
        .btn-info{color:#0096ff;border-color:rgba(0,150,255,0.3);background:rgba(0,150,255,0.05);}
        .btn-info:hover{background:rgba(0,150,255,0.15);}
        .btn-success{color:#00ff78;border-color:rgba(0,255,120,0.3);background:rgba(0,255,120,0.05);}
        .btn-success:hover{background:rgba(0,255,120,0.15);}
        .btn-warn{color:#ffc800;border-color:rgba(255,200,0,0.3);background:rgba(255,200,0,0.05);}
        .btn-warn:hover{background:rgba(255,200,0,0.15);}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,8,0.92);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center;}
        .field-input{width:100%;background:#050015;border:1px solid #1a0035;border-radius:2px;padding:11px 14px;color:#fff;font-family:inherit;font-size:12px;transition:all 0.2s;}
        .field-input:focus{border-color:rgba(255,0,60,0.5);box-shadow:0 0 10px rgba(255,0,60,0.1);}
        .glow-text{text-shadow:0 0 10px currentColor;}
        .neon-line{height:1px;background:linear-gradient(to right,transparent,rgba(255,0,60,0.5),transparent);}
        .hex-bg::after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,0,60,0.03) 1px,transparent 1px);background-size:20px 20px;pointer-events:none;}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 230, background: 'linear-gradient(180deg, #040012 0%, #020008 100%)',
        borderRight: '1px solid #100025', display: 'flex', flexDirection: 'column',
        padding: '0', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden'
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #100025', position: 'relative' }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: '#ff003c', letterSpacing: 3, textShadow: '0 0 20px rgba(255,0,60,0.6)' }}>WHISPER</div>
          <div style={{ color: '#330015', fontSize: 8, letterSpacing: 4, marginTop: 2 }}>ADMIN CONTROL CENTER</div>
          <div className="neon-line" style={{ marginTop: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff78', display: 'inline-block', boxShadow: '0 0 6px #00ff78' }} />
            <span style={{ color: '#00ff78', fontSize: 8, letterSpacing: 2 }}>SYSTEM ONLINE</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
              <span style={{ fontSize: 13, minWidth: 16 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.alert && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff003c', boxShadow: '0 0 8px #ff003c', flexShrink: 0 }} className="pulse-dot" />}
              {n.count !== undefined && n.count > 0 && !n.alert && (
                <span style={{ fontSize: 9, color: '#330015', background: '#0a0020', border: '1px solid #1a0035', borderRadius: 2, padding: '1px 6px', minWidth: 24, textAlign: 'center' }}>{n.count > 999 ? '999+' : n.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid #100025' }}>
          <button className="nav-item" onClick={logout} style={{ color: '#ff003c' }}>
            <span>⏻</span> LOGOUT
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 36px', position: 'relative' }}>
        {/* Subtle scanline */}
        <div style={{ position: 'fixed', top: 0, left: 230, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,60,0.008) 2px, rgba(255,0,60,0.008) 4px)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: '#330015', fontSize: 9, letterSpacing: 3, marginBottom: 4 }}>
              {NAV.find(n => n.id === tab)?.icon} // {tab.toUpperCase()}.exe
            </div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: 1, fontFamily: "'Orbitron', monospace" }}>
              {tab === 'dashboard' ? 'OVERVIEW' : tab === 'users' ? 'USER MGMT' : tab === 'posts' ? 'CONTENT MOD' : tab === 'rooms' ? 'GOSSIP ROOMS' : tab === 'messages' ? 'PRIVATE MSGS' : tab === 'collabs' ? 'DEV COLLABS' : tab === 'communities' ? 'COMMUNITIES' : tab === 'notifications' ? 'NOTIFICATIONS' : 'SETTINGS'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tab !== 'dashboard' && tab !== 'settings' && (
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#330015', fontSize: 13 }}>⌕</span>
                <input className="search-box" placeholder="SEARCH..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <button className="action-btn btn-info" onClick={() => load(tab)} style={{ padding: '8px 16px', letterSpacing: 2 }}>↺ REFRESH</button>
          </div>
        </div>

        {loading && (
          <div style={{ color: '#330015', fontSize: 11, letterSpacing: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff003c', display: 'inline-block', boxShadow: '0 0 8px #ff003c' }} />
            LOADING DATA...
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {!loading && tab === 'dashboard' && stats && (
          <div className="fade-in" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
              {[
                { label: 'TOTAL USERS', val: stats.totalUsers, icon: '⬡', color: '#0096ff', sub: 'registered accounts' },
                { label: 'TOTAL POSTS', val: stats.totalThoughts, icon: '◉', color: '#b400ff', sub: 'whispers posted' },
                { label: 'ACTIVE ROOMS', val: stats.totalRooms, icon: '⬟', color: '#ffc800', sub: 'gossip rooms' },
                { label: 'MESSAGES', val: stats.totalMessages, icon: '◎', color: '#00ff78', sub: 'private msgs' },
                { label: 'DEV COLLABS', val: stats.totalCollabs, icon: '⬢', color: '#ff003c', sub: 'collab projects' },
                { label: 'COMMUNITIES', val: stats.totalCommunities, icon: '◐', color: '#00ffff', sub: 'topic groups' },
                { label: 'NOTIFICATIONS', val: stats.totalNotifications || 0, icon: '◆', color: '#ff6600', sub: 'system notifs' },
                { label: 'PENDING JOINS', val: stats.recentCommunities?.reduce((a: number, c: any) => a + (c.joinRequests?.filter((r: any) => r.status === 'pending').length || 0), 0) || 0, icon: '⚡', color: '#ff003c', sub: 'awaiting approval' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 22, opacity: 0.15, color: s.color }}>{s.icon}</div>
                  <div style={{ color: s.color, fontSize: 9, letterSpacing: 3, marginBottom: 8, opacity: 0.8 }}>{s.label}</div>
                  <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, letterSpacing: -1, fontFamily: "'Orbitron', monospace", textShadow: `0 0 20px ${s.color}44` }}>{s.val}</div>
                  <div style={{ color: '#330015', fontSize: 9, marginTop: 4, letterSpacing: 1 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <div style={{ border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,0,60,0.03)' }}>
                  <span style={{ color: '#ff003c', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>◈ RECENT USERS</span>
                  <button className="action-btn btn-info" onClick={() => setTab('users')}>VIEW ALL</button>
                </div>
                {stats.recentUsers?.map((u: any) => (
                  <div key={u._id} style={{ padding: '11px 18px', borderBottom: '1px solid #080018' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#fff', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>@{u.username}</div>
                        <div style={{ color: '#2a2a4a', fontSize: 9, marginTop: 2 }}>{u.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${u.isVerified ? 'tag-green' : 'tag-yellow'}`}>{u.isVerified ? '✓' : '⏳'}</span>
                        <div style={{ color: '#2a2a4a', fontSize: 8, marginTop: 3 }}>{ago(u.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,0,60,0.03)' }}>
                  <span style={{ color: '#ff003c', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>◉ RECENT POSTS</span>
                  <button className="action-btn btn-info" onClick={() => setTab('posts')}>VIEW ALL</button>
                </div>
                {stats.recentThoughts?.map((t: any) => (
                  <div key={t._id} style={{ padding: '11px 18px', borderBottom: '1px solid #080018' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: '#0096ff', fontSize: 10 }}>@{t.username}</span>
                      <span style={{ color: '#2a2a4a', fontSize: 9 }}>{ago(t.createdAt)}</span>
                    </div>
                    <div style={{ color: '#555', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.mood} {t.content}</div>
                  </div>
                ))}
              </div>

              <div style={{ border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,0,60,0.03)' }}>
                  <span style={{ color: '#ff003c', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>◐ COMMUNITIES</span>
                  <button className="action-btn btn-info" onClick={() => setTab('communities')}>VIEW ALL</button>
                </div>
                {stats.recentCommunities?.map((c: any) => (
                  <div key={c._id} style={{ padding: '11px 18px', borderBottom: '1px solid #080018' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#fff', fontSize: 11 }}>{c.name}</div>
                        <div style={{ color: '#00ffff', fontSize: 9, marginTop: 1 }}>#{c.topic}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#b400ff', fontSize: 10 }}>{c.members?.length || 0} members</div>
                        {(c.joinRequests?.filter((r: any) => r.status === 'pending').length || 0) > 0 && (
                          <span className="badge tag-red" style={{ marginTop: 3 }}>
                            {c.joinRequests.filter((r: any) => r.status === 'pending').length} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {!loading && tab === 'users' && (
          <div className="fade-in" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
              <table className="data-table">
                <thead><tr style={{ background: '#030010' }}>
                  <th>USERNAME</th><th>EMAIL</th><th>STATUS</th><th>POSTS</th><th>MSGS</th><th>JOINED</th><th></th>
                </tr></thead>
                <tbody>
                  {fUsers.map(u => (
                    <tr key={u._id} className="row-hover">
                      <td style={{ color: '#fff' }}>@{u.username}</td>
                      <td style={{ color: '#444' }}>{u.email}</td>
                      <td><span className={`badge ${u.isVerified ? 'tag-green' : 'tag-yellow'}`}>{u.isVerified ? '✓ VERIFIED' : '⏳ PENDING'}</span></td>
                      <td style={{ color: '#b400ff' }}>{u.postCount}</td>
                      <td style={{ color: '#00ff78' }}>{u.msgCount}</td>
                      <td style={{ color: '#2a2a4a', fontSize: 10 }}>{fmt(u.createdAt)}</td>
                      <td><button className="action-btn btn-danger del-btn" onClick={() => delUser(u.username)}>DELETE</button></td>
                    </tr>
                  ))}
                  {fUsers.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#222', padding: 40 }}>NO USERS FOUND</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── POSTS ── */}
        {!loading && tab === 'posts' && (
          <div className="fade-in" style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1, border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
              <table className="data-table">
                <thead><tr style={{ background: '#030010' }}>
                  <th>AUTHOR</th><th>CONTENT</th><th>MOOD</th><th>CATEGORY</th><th>REACTIONS</th><th>POSTED</th><th></th>
                </tr></thead>
                <tbody>
                  {fPosts.map(p => (
                    <tr key={p._id} className="row-hover" style={{ cursor: 'pointer' }} onClick={() => setExpandedPost(p)}>
                      <td style={{ color: '#0096ff' }}>@{p.username}</td>
                      <td style={{ color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</td>
                      <td style={{ fontSize: 16 }}>{p.mood}</td>
                      <td><span className="badge tag-purple">{p.category || 'general'}</span></td>
                      <td style={{ fontSize: 10 }}>
                        <span style={{ color: '#0096ff' }}>▲{p.likes?.length || 0} </span>
                        <span style={{ color: '#ff003c' }}>▼{p.dislikes?.length || 0} </span>
                        <span style={{ color: '#ffc800' }}>💬{p.comments?.length || 0}</span>
                      </td>
                      <td style={{ color: '#2a2a4a', fontSize: 10 }}>{ago(p.createdAt)}</td>
                      <td onClick={e => e.stopPropagation()}><button className="action-btn btn-danger del-btn" onClick={() => delPost(p._id)}>DEL</button></td>
                    </tr>
                  ))}
                  {fPosts.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#222', padding: 40 }}>NO POSTS FOUND</td></tr>}
                </tbody>
              </table>
            </div>
            {expandedPost && (
              <div className="slide-in" style={{ width: 300, border: '1px solid rgba(255,0,60,0.3)', borderRadius: 4, background: '#040012', alignSelf: 'flex-start', position: 'sticky', top: 0, boxShadow: '0 0 30px rgba(255,0,60,0.08)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,0,60,0.05)' }}>
                  <span style={{ color: '#ff003c', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>POST DETAIL</span>
                  <button onClick={() => setExpandedPost(null)} style={{ background: 'none', border: 'none', color: '#333', fontSize: 16 }}>✕</button>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ color: '#0096ff', fontWeight: 700, marginBottom: 10 }}>@{expandedPost.username}</div>
                  <div style={{ color: '#999', fontSize: 13, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 14 }}>"{expandedPost.content}"</div>
                  {expandedPost.images?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 14 }}>
                      {expandedPost.images.map((img: string, i: number) => <img key={i} src={img} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 3 }} />)}
                    </div>
                  )}
                  <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>COMMENTS ({expandedPost.comments?.length || 0})</div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {expandedPost.comments?.map((c: any, i: number) => (
                      <div key={i} style={{ background: '#080018', borderRadius: 3, padding: '7px 10px', border: '1px solid #100025' }}>
                        <div style={{ color: '#0096ff', fontSize: 9, marginBottom: 2 }}>@{c.username}</div>
                        <div style={{ color: '#666', fontSize: 11 }}>{c.text}</div>
                      </div>
                    ))}
                  </div>
                  <button className="action-btn btn-danger" style={{ width: '100%', padding: '9px 0', marginTop: 14 }} onClick={() => delPost(expandedPost._id)}>DELETE POST</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROOMS ── */}
        {!loading && tab === 'rooms' && (
          <div className="fade-in" style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ flex: selectedRoom ? '0 0 320px' : 1 }}>
              {fRooms.map(r => (
                <div key={r._id} className="card-item" onClick={() => setSelectedRoom(r)}
                  style={{ border: `1px solid ${selectedRoom?._id === r._id ? 'rgba(255,0,60,0.5)' : '#100025'}`, borderRadius: 4, padding: '14px 18px', marginBottom: 8, background: '#040012', cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedRoom?._id === r._id ? '0 0 20px rgba(255,0,60,0.1)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700 }}>#{r.name} {r.password && <span style={{ color: '#ffc800', fontSize: 11 }}>🔒</span>}</div>
                      <div style={{ color: '#333', fontSize: 10, marginTop: 2 }}>{r.description || 'No description'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#00ff78', fontSize: 11 }}>{r.messages?.length || 0} msgs</div>
                      <div style={{ color: '#2a2a4a', fontSize: 9, marginTop: 2 }}>@{r.admin}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                    <span style={{ color: '#2a2a4a', fontSize: 9 }}>{ago(r.createdAt)}</span>
                    <button className="action-btn btn-danger del-btn" onClick={e => { e.stopPropagation(); delRoom(r._id); }}>DELETE</button>
                  </div>
                </div>
              ))}
              {fRooms.length === 0 && <div style={{ textAlign: 'center', color: '#222', padding: 60 }}>NO ROOMS FOUND</div>}
            </div>
            {selectedRoom && (
              <div style={{ flex: 1, border: '1px solid rgba(255,0,60,0.2)', borderRadius: 4, background: '#040012', overflow: 'hidden', boxShadow: '0 0 30px rgba(255,0,60,0.06)' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,0,60,0.04)' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 700 }}>#{selectedRoom.name}</span>
                    <span style={{ color: '#333', fontSize: 10, marginLeft: 10 }}>{selectedRoom.messages?.length} messages</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="action-btn btn-danger" onClick={() => delRoom(selectedRoom._id)}>DELETE ROOM</button>
                    <button style={{ background: 'none', border: 'none', color: '#333', fontSize: 18, cursor: 'pointer' }} onClick={() => setSelectedRoom(null)}>✕</button>
                  </div>
                </div>
                <div style={{ padding: 14, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedRoom.messages?.length === 0 && <div style={{ textAlign: 'center', color: '#222', padding: 40 }}>NO MESSAGES</div>}
                  {selectedRoom.messages?.map((m: any, i: number) => (
                    <div key={m.id || i} className="card-item" style={{ background: '#080018', borderRadius: 4, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, border: '1px solid #0f0025' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
                          <span style={{ color: '#0096ff', fontSize: 10 }}>@{m.username}</span>
                          <span style={{ color: '#222', fontSize: 9 }}>{fmt(m.createdAt)}</span>
                        </div>
                        {m.text && <div style={{ color: '#888', fontSize: 12 }}>{m.text}</div>}
                        {m.media?.url && m.media.fileType?.startsWith('image') && <img src={m.media.url} alt="" style={{ maxWidth: 180, maxHeight: 100, borderRadius: 3, marginTop: 5, objectFit: 'cover' }} />}
                      </div>
                      <button className="action-btn btn-danger del-btn" style={{ flexShrink: 0 }} onClick={() => delRoomMsg(selectedRoom._id, m.id)}>DEL</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {!loading && tab === 'messages' && (
          <div className="fade-in" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 160px)', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 270, border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#040012' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #100025', color: '#330015', fontSize: 9, letterSpacing: 2, background: 'rgba(255,0,60,0.03)' }}>CONVERSATIONS ({fConvos.length})</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {fConvos.map((c, i) => (
                  <div key={i} onClick={() => openConvo(c.u1, c.u2)}
                    style={{ padding: '11px 14px', borderBottom: '1px solid #080018', cursor: 'pointer', background: selectedConvo?.u1 === c.u1 && selectedConvo?.u2 === c.u2 ? 'rgba(0,150,255,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: '#0096ff', fontSize: 11 }}>@{c.u1}</span>
                      <span style={{ color: '#222', fontSize: 9 }}>↔</span>
                      <span style={{ color: '#b400ff', fontSize: 11 }}>@{c.u2}</span>
                    </div>
                    <div style={{ color: '#333', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last.text || '[media]'}</div>
                    <div style={{ color: '#222', fontSize: 9, marginTop: 2 }}>{ago(c.last.createdAt)}</div>
                  </div>
                ))}
                {fConvos.length === 0 && <div style={{ textAlign: 'center', color: '#222', padding: 40, fontSize: 11 }}>NO CONVERSATIONS</div>}
              </div>
            </div>
            <div style={{ flex: 1, border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#040012' }}>
              {!selectedConvo ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a3a', fontSize: 11, letterSpacing: 3 }}>SELECT A CONVERSATION</div>
              ) : (
                <>
                  <div style={{ padding: '11px 18px', borderBottom: '1px solid #100025', display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,0,60,0.03)' }}>
                    <span style={{ color: '#0096ff', fontWeight: 700 }}>@{selectedConvo.u1}</span>
                    <span style={{ color: '#333' }}>↔</span>
                    <span style={{ color: '#b400ff', fontWeight: 700 }}>@{selectedConvo.u2}</span>
                    <span style={{ color: '#2a2a4a', fontSize: 10, marginLeft: 8 }}>{convoMessages.length} messages</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {convoMessages.map(m => (
                      <div key={m._id} className="card-item" style={{ display: 'flex', gap: 10, alignSelf: m.sender === selectedConvo.u1 ? 'flex-start' : 'flex-end', maxWidth: 520 }}>
                        <div style={{ flex: 1, background: m.sender === selectedConvo.u1 ? '#080018' : 'rgba(180,0,255,0.06)', border: `1px solid ${m.sender === selectedConvo.u1 ? '#100025' : 'rgba(180,0,255,0.2)'}`, borderRadius: 4, padding: '9px 12px' }}>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                            <span style={{ color: m.sender === selectedConvo.u1 ? '#0096ff' : '#b400ff', fontSize: 10 }}>@{m.sender}</span>
                            <span style={{ color: '#222', fontSize: 9 }}>→ @{m.receiver}</span>
                            <span style={{ color: '#222', fontSize: 9, marginLeft: 'auto' }}>{fmt(m.createdAt)}</span>
                          </div>
                          {m.text && <div style={{ color: '#ccc', fontSize: 12 }}>{m.text}</div>}
                        </div>
                        <button className="action-btn btn-danger del-btn" style={{ flexShrink: 0, marginTop: 4 }} onClick={() => delMessage(m._id)}>DEL</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── COLLABS ── */}
        {!loading && tab === 'collabs' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, position: 'relative', zIndex: 1 }}>
            {fCollabs.map(c => (
              <div key={c._id} className="card-item" style={{ border: '1px solid #100025', borderRadius: 4, background: '#040012', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #100025', background: 'rgba(255,0,60,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{c.title}</div>
                    {c.password && <span className="badge tag-yellow">🔒 PRIVATE</span>}
                  </div>
                  <div style={{ color: '#444', fontSize: 11 }}>{c.description || 'No description'}</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  {c.techStack && <div style={{ marginBottom: 8 }}><span className="badge tag-blue">{c.techStack}</span></div>}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 5 }}>MEMBERS ({c.members?.length || 0})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {c.members?.map((m: any, i: number) => (
                        <span key={i} style={{ background: '#080018', border: '1px solid #100025', borderRadius: 2, padding: '2px 7px', fontSize: 9, color: m.username === c.admin ? '#ffc800' : '#555' }}>
                          {m.username === c.admin ? '👑 ' : ''}@{m.displayName || m.username}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#2a2a4a', fontSize: 9 }}>{ago(c.createdAt)}</span>
                    <button className="action-btn btn-danger del-btn" onClick={() => delCollab(c._id)}>DELETE</button>
                  </div>
                </div>
              </div>
            ))}
            {fCollabs.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#222', padding: 60 }}>NO COLLAB PROJECTS</div>}
          </div>
        )}

        {/* ── COMMUNITIES ── */}
        {!loading && tab === 'communities' && (
          <div className="fade-in" style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ flex: expandedCommunity ? '0 0 360px' : 1 }}>
              {fCommunities.map(c => {
                const pending = c.joinRequests?.filter((r: any) => r.status === 'pending').length || 0;
                return (
                  <div key={c._id} className="card-item" onClick={() => setExpandedCommunity(c)}
                    style={{ border: `1px solid ${expandedCommunity?._id === c._id ? 'rgba(255,0,60,0.5)' : pending > 0 ? 'rgba(255,200,0,0.3)' : '#100025'}`, borderRadius: 4, padding: '14px 18px', marginBottom: 8, background: '#040012', cursor: 'pointer', transition: 'all 0.2s', boxShadow: expandedCommunity?._id === c._id ? '0 0 20px rgba(255,0,60,0.1)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{c.name}</span>
                          <span className="badge tag-cyan">#{c.topic}</span>
                          {c.password && <span className="badge tag-yellow">🔒</span>}
                          {pending > 0 && <span className="badge tag-red">{pending} PENDING</span>}
                        </div>
                        <div style={{ color: '#333', fontSize: 10, marginTop: 4 }}>{c.description || 'No description'}</div>
                        <div style={{ color: '#2a2a4a', fontSize: 9, marginTop: 3 }}>Admin: @{c.admin} · {c.members?.length || 0} members · {c.posts?.length || 0} posts</div>
                      </div>
                      <button className="action-btn btn-danger del-btn" style={{ flexShrink: 0, marginLeft: 12 }} onClick={e => { e.stopPropagation(); delCommunity(c._id); }}>DELETE</button>
                    </div>
                  </div>
                );
              })}
              {fCommunities.length === 0 && <div style={{ textAlign: 'center', color: '#222', padding: 60 }}>NO COMMUNITIES FOUND</div>}
            </div>

            {expandedCommunity && (
              <div className="slide-in" style={{ flex: 1, border: '1px solid rgba(255,0,60,0.3)', borderRadius: 4, background: '#040012', overflow: 'hidden', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', boxShadow: '0 0 30px rgba(255,0,60,0.08)' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#040012', zIndex: 10 }}>
                  <div>
                    <span style={{ color: '#ff003c', fontWeight: 700 }}>{expandedCommunity.name}</span>
                    <span className="badge tag-cyan" style={{ marginLeft: 8 }}>#{expandedCommunity.topic}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="action-btn btn-danger" onClick={() => delCommunity(expandedCommunity._id)}>DELETE</button>
                    <button style={{ background: 'none', border: 'none', color: '#333', fontSize: 18, cursor: 'pointer' }} onClick={() => setExpandedCommunity(null)}>✕</button>
                  </div>
                </div>

                <div style={{ padding: 16 }}>
                  {/* PENDING JOIN REQUESTS */}
                  {expandedCommunity.joinRequests?.filter((r: any) => r.status === 'pending').length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ color: '#ffc800', fontSize: 10, letterSpacing: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffc800', display: 'inline-block', boxShadow: '0 0 8px #ffc800' }} />
                        PENDING JOIN REQUESTS ({expandedCommunity.joinRequests.filter((r: any) => r.status === 'pending').length})
                      </div>
                      {expandedCommunity.joinRequests.filter((r: any) => r.status === 'pending').map((req: any, i: number) => (
                        <div key={i} style={{ background: 'rgba(255,200,0,0.05)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: 4, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ color: '#0096ff', fontWeight: 700 }}>@{req.username}</span>
                            <span style={{ color: '#333', fontSize: 9, marginLeft: 10 }}>{ago(req.requestedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="action-btn btn-success" onClick={() => approveJoinRequest(expandedCommunity._id, req.username)}>✓ APPROVE</button>
                            <button className="action-btn btn-danger" onClick={() => rejectJoinRequest(expandedCommunity._id, req.username)}>✕ REJECT</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MEMBERS */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>MEMBERS ({expandedCommunity.members?.length || 0})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {expandedCommunity.members?.map((m: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#080018', border: '1px solid #100025', borderRadius: 3, padding: '4px 8px' }}>
                          <span style={{ fontSize: 10, color: m.username === expandedCommunity.admin ? '#ffc800' : '#666' }}>
                            {m.username === expandedCommunity.admin ? '👑 ' : ''}@{m.username}
                          </span>
                          {m.username !== expandedCommunity.admin && (
                            <button onClick={() => removeMember(expandedCommunity._id, m.username)} style={{ background: 'none', border: 'none', color: '#330015', fontSize: 11, cursor: 'pointer', lineHeight: 1 }} onMouseEnter={e => e.currentTarget.style.color = '#ff003c'} onMouseLeave={e => e.currentTarget.style.color = '#330015'}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* POSTS */}
                  <div>
                    <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>POSTS ({expandedCommunity.posts?.length || 0})</div>
                    {expandedCommunity.posts?.slice().reverse().slice(0, 10).map((p: any) => (
                      <div key={p._id} style={{ background: '#080018', border: '1px solid #100025', borderRadius: 4, padding: '10px 12px', marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#0096ff', fontSize: 10 }}>@{p.username}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ color: '#2a2a4a', fontSize: 9 }}>{ago(p.createdAt)}</span>
                            <button className="action-btn btn-danger del-btn" style={{ padding: '2px 8px' }} onClick={() => delCommunityPost(expandedCommunity._id, p._id)}>DEL</button>
                          </div>
                        </div>
                        {p.content && <div style={{ color: '#888', fontSize: 11 }}>{p.content}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 5, fontSize: 9, color: '#333' }}>
                          <span>❤️ {p.likes?.length || 0}</span>
                          <span>💬 {p.comments?.length || 0}</span>
                          {p.media?.length > 0 && <span>📎 {p.media.length} media</span>}
                        </div>
                      </div>
                    ))}
                    {!expandedCommunity.posts?.length && <div style={{ color: '#222', fontSize: 11, padding: '20px 0' }}>No posts yet</div>}

                    {/* ALL JOIN REQUESTS HISTORY */}
                    {expandedCommunity.joinRequests?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>ALL JOIN REQUESTS</div>
                        {expandedCommunity.joinRequests.map((req: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #080018', fontSize: 10 }}>
                            <span style={{ color: '#0096ff' }}>@{req.username}</span>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <span style={{ color: '#2a2a4a', fontSize: 9 }}>{ago(req.requestedAt)}</span>
                              <span className={`badge ${req.status === 'approved' ? 'tag-green' : req.status === 'rejected' ? 'tag-red' : 'tag-yellow'}`}>{req.status.toUpperCase()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {!loading && tab === 'notifications' && (
          <div className="fade-in" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ border: '1px solid #100025', borderRadius: 4, overflow: 'hidden', background: '#040012' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #100025', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,0,60,0.03)' }}>
                <span style={{ color: '#ff003c', fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>◆ SYSTEM NOTIFICATIONS ({fNotifications.length})</span>
                <span style={{ color: '#333', fontSize: 9 }}>{fNotifications.filter(n => !n.read).length} unread</span>
              </div>
              <table className="data-table">
                <thead><tr style={{ background: '#030010' }}>
                  <th>TYPE</th><th>RECIPIENT</th><th>SENDER</th><th>TITLE</th><th>BODY</th><th>READ</th><th>TIME</th>
                </tr></thead>
                <tbody>
                  {fNotifications.map(n => (
                    <tr key={n._id} className="row-hover" style={{ opacity: n.read ? 0.5 : 1 }}>
                      <td><span style={{ fontSize: 16 }}>{NOTIF_ICONS[n.type] || NOTIF_ICONS.default}</span></td>
                      <td style={{ color: '#0096ff' }}>@{n.recipient}</td>
                      <td style={{ color: '#b400ff' }}>{n.sender ? `@${n.sender}` : '-'}</td>
                      <td style={{ color: '#ccc', fontSize: 11 }}>{n.title}</td>
                      <td style={{ color: '#555', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</td>
                      <td><span className={`badge ${n.read ? 'tag-green' : 'tag-red'}`}>{n.read ? 'READ' : 'UNREAD'}</span></td>
                      <td style={{ color: '#2a2a4a', fontSize: 10 }}>{ago(n.createdAt)}</td>
                    </tr>
                  ))}
                  {fNotifications.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#222', padding: 40 }}>NO NOTIFICATIONS</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div className="fade-in" style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
            <div style={{ border: '1px solid rgba(255,0,60,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 20, boxShadow: '0 0 30px rgba(255,0,60,0.05)' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #100025', background: 'rgba(255,0,60,0.05)' }}>
                <div style={{ color: '#ff003c', fontWeight: 700, fontSize: 12, letterSpacing: 2 }}>CHANGE ADMIN PASSWORD</div>
                <div style={{ color: '#333', fontSize: 10, marginTop: 3 }}>You will be logged out after changing password.</div>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'CURRENT PASSWORD', key: 'current', ph: 'Enter current password' },
                  { label: 'NEW PASSWORD (min 8 chars)', key: 'next', ph: 'Enter new password' },
                  { label: 'CONFIRM NEW PASSWORD', key: 'confirm', ph: 'Repeat new password' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ color: '#333', fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>{f.label}</div>
                    <input type="password" className="field-input" value={(pwForm as any)[f.key]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      onKeyDown={e => f.key === 'confirm' && e.key === 'Enter' && changePassword()} />
                  </div>
                ))}
                {pwError && <div style={{ color: '#ff003c', fontSize: 11, background: 'rgba(255,0,60,0.06)', border: '1px solid rgba(255,0,60,0.2)', borderRadius: 3, padding: '10px 14px' }}>⚠ {pwError}</div>}
                {pwSuccess && <div style={{ color: '#00ff78', fontSize: 11, background: 'rgba(0,255,120,0.05)', border: '1px solid rgba(0,255,120,0.2)', borderRadius: 3, padding: '10px 14px' }}>✓ {pwSuccess}</div>}
                <button onClick={changePassword} disabled={pwLoading}
                  style={{ padding: '13px 0', background: 'transparent', border: '1px solid #ff003c', color: '#ff003c', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', borderRadius: 3, transition: 'all 0.2s', opacity: pwLoading ? 0.5 : 1, textShadow: '0 0 10px rgba(255,0,60,0.4)' }}
                  onMouseEnter={e => { if (!pwLoading) { e.currentTarget.style.background = '#ff003c'; e.currentTarget.style.color = '#000'; e.currentTarget.style.textShadow = 'none'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff003c'; e.currentTarget.style.textShadow = '0 0 10px rgba(255,0,60,0.4)'; }}>
                  {pwLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid #100025', borderRadius: 4, padding: '20px 24px', background: '#040012' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, marginBottom: 16, fontFamily: "'Orbitron', monospace" }}>SESSION INFO</div>
              {[
                { label: 'AUTH', val: 'JWT Bearer Token' },
                { label: 'DURATION', val: '8 Hours' },
                { label: 'STORAGE', val: 'localStorage' },
                { label: 'PROTECTED', val: '/api/admin/* (ALL)' },
                { label: 'VERSION', val: 'Whisper Admin v3.0' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #080018' }}>
                  <span style={{ color: '#330015', fontSize: 9, letterSpacing: 2 }}>{r.label}</span>
                  <span style={{ color: '#666', fontSize: 11 }}>{r.val}</span>
                </div>
              ))}
              <button className="action-btn btn-danger" style={{ marginTop: 16, width: '100%', padding: '10px 0' }} onClick={logout}>LOGOUT NOW</button>
            </div>
          </div>
        )}
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 500,
          background: toast.type === 'ok' ? '#020012' : '#120005',
          border: `1px solid ${toast.type === 'ok' ? 'rgba(0,255,120,0.4)' : 'rgba(255,0,60,0.4)'}`,
          color: toast.type === 'ok' ? '#00ff78' : '#ff003c',
          padding: '12px 20px', borderRadius: 3,
          fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 1,
          boxShadow: `0 0 20px ${toast.type === 'ok' ? 'rgba(0,255,120,0.15)' : 'rgba(255,0,60,0.15)'}`,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.type === 'ok' ? '✓' : '✗'} {toast.msg.toUpperCase()}
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#040012', border: '1px solid rgba(255,0,60,0.4)', borderRadius: 4,
            padding: '32px 36px', width: 400, fontFamily: "'Share Tech Mono', monospace",
            animation: 'fadeIn 0.2s ease', boxShadow: '0 0 60px rgba(255,0,60,0.15)',
          }}>
            <div style={{ color: '#ff003c', fontSize: 9, letterSpacing: 3, marginBottom: 8 }}>⚠ CONFIRM ACTION</div>
            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>{confirm.msg}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { confirm.action(); setConfirm(null); }}
                style={{ flex: 1, padding: '11px 0', background: 'rgba(255,0,60,0.1)', border: '1px solid #ff003c', color: '#ff003c', fontFamily: 'inherit', fontSize: 10, letterSpacing: 2, fontWeight: 700, borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,0,60,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,60,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                CONFIRM
              </button>
              <button onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: '11px 0', background: 'transparent', border: '1px solid #1a0035', color: '#444', fontFamily: 'inherit', fontSize: 10, letterSpacing: 2, fontWeight: 700, borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}