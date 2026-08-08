"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';

const socket = io('https://whisper-mi0t.onrender.com');

const MOODS = [
  { emoji: "😊", label: "Happy" }, 
  { emoji: "😔", label: "Sad" }, 
  { emoji: "🔥", label: "Lit" },
  { emoji: "😴", label: "Tired" }, 
  { emoji: "🙏", label: "Blessed" }, 
  { emoji: "😎", label: "Chill" },    
  { emoji: "💖", label: "Ishq" },      
  { emoji: "🙄", label: "Bored" },    
  { emoji: "🤬", label: "Gussa" },    
  { emoji: "😰", label: "Stress" },   
  { emoji: "🤔", label: "Thinking" }, 
  { emoji: "🍕", label: "Hungry" }
];

const CATEGORIES = ["All", "Most Visited", "Internet Culture", "Games", "Q&As & Stories", "Movies & TV", "Technology", "Pop Culture", "Places & Travel", "Sports", "Business & Finance"];

const COMMUNITY_TOPICS = ["Technology", "Gaming", "Music", "Art", "Sports", "Food", "Travel", "Fitness", "Movies", "Books", "Science", "Business", "Fashion", "Photography", "Comedy", "News", "Education", "Other"];

const NICKNAME_SUGGESTIONS = [
  "ShadowFox", "NeonGhost", "CrypticOwl", "VoidWalker", "StarlitRogue",
  "PhantomDrift", "SilentNova", "DarkPulse", "MysticFlare", "EchoWraith",
  "CobaltSpectre", "LunarByte", "NightCipher", "IronMirage", "ArcaneShift",
  "QuantumVeil", "GlitchReaper", "StormCipher", "HexBlade", "NullVector"
];

const VS_CODE_OPTIONS = {
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  fontLigatures: true,
  lineHeight: 22,
  letterSpacing: 0.5,
  minimap: { enabled: true, scale: 1 },
  scrollbar: { vertical: 'auto', horizontal: 'auto' },
  renderLineHighlight: 'all',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  renderWhitespace: 'selection',
  wordWrap: 'on',
  formatOnPaste: true,
  formatOnType: true,
  tabSize: 2,
  insertSpaces: true,
  autoIndent: 'full',
  folding: true,
  foldingHighlight: true,
  showFoldingControls: 'mouseover',
  lineNumbers: 'on',
  glyphMargin: true,
  padding: { top: 16, bottom: 16 },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  quickSuggestions: true,
  parameterHints: { enabled: true },
  hover: { enabled: true },
  contextmenu: true,
  mouseWheelZoom: true,
  stickyScroll: { enabled: true },
  codeLens: true,
  colorDecorators: true,
};

type DrawPoint = { x: number; y: number };
type DrawAction = {
  type: 'draw' | 'erase' | 'text' | 'rect' | 'circle' | 'line' | 'arrow';
  points?: DrawPoint[];
  color?: string;
  width?: number;
  text?: string;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  fontSize?: number;
};

function HScrollWithArrows({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    return () => { if (el) el.removeEventListener('scroll', checkScroll); };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className={`relative group/scroll ${className}`}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl hover:bg-zinc-800 hover:border-zinc-500 transition-all duration-200 opacity-0 group-hover/scroll:opacity-100"
          style={{ boxShadow: '4px 0 16px rgba(0,0,0,0.8)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar flex gap-2.5 px-1 py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl hover:bg-zinc-800 hover:border-zinc-500 transition-all duration-200 opacity-0 group-hover/scroll:opacity-100"
          style={{ boxShadow: '-4px 0 16px rgba(0,0,0,0.8)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [view, setView] = useState("home"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [selectedMood, setSelectedMood] = useState("😊");
  const [moodFilter, setMoodFilter] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [commentModalPost, setCommentModalPost] = useState<any>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: "", description: "", password: "" });
  const [chatInput, setChatInput] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]); 
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [pmText, setPmText] = useState("");
  const [privateMessages, setPrivateMessages] = useState<any[]>([]);

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [postFiles, setPostFiles] = useState<{url: string; fileName: string; fileType: string}[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const filePostInputRef = useRef<HTMLInputElement>(null);
  const roomFileRef = useRef<HTMLInputElement>(null);
  const pmFileRef = useRef<HTMLInputElement>(null);
  const communityFileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const [timeLeft, setTimeLeft] = useState("");

  const [selectedProfileUser, setSelectedProfileUser] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);

  const [collabs, setCollabs] = useState<any[]>([]);
  const [isCreateCollabOpen, setIsCreateCollabOpen] = useState(false);
  const [newCollabData, setNewCollabData] = useState({ title: "", description: "", techStack: "", password: "" });
  const [activeCollab, setActiveCollab] = useState<any>(null);
  const [editorCode, setEditorCode] = useState("// Start Coding...");

  const [devTab, setDevTab] = useState<'code' | 'whiteboard'>('code');

  const [editorPasswordModal, setEditorPasswordModal] = useState<any>(null);
  const [editorPasswordInput, setEditorPasswordInput] = useState("");
  const [editorPasswordError, setEditorPasswordError] = useState("");

  const [nicknamePendingRoom, setNicknamePendingRoom] = useState<any>(null);
  const [nicknameChoice, setNicknameChoice] = useState<"original" | "new">("original");
  const [customNickname, setCustomNickname] = useState("");
  const [selectedNickname, setSelectedNickname] = useState("");
  const [roomDisplayName, setRoomDisplayName] = useState("");

  const [collabJoinModal, setCollabJoinModal] = useState<any>(null);
  const [collabJoinPassword, setCollabJoinPassword] = useState("");
  const [collabJoinNickname, setCollabJoinNickname] = useState("");

  // Communities state
  const [communities, setCommunities] = useState<any[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<any>(null);
  const [communityView, setCommunityView] = useState<'list' | 'detail'>('list');
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [newCommunityData, setNewCommunityData] = useState({ name: "", description: "", topic: "Technology", password: "" });
  const [communityPostInput, setCommunityPostInput] = useState("");
  const [communityMedia, setCommunityMedia] = useState<{url: string; fileType: string; fileName: string}[]>([]);
  const [communityCommentModal, setCommunityCommentModal] = useState<any>(null);
  const [communityCommentInput, setCommunityCommentInput] = useState("");
  const [joinPasswordModal, setJoinPasswordModal] = useState<any>(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState("");

  // Community search
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [communityDetailSearchQuery, setCommunityDetailSearchQuery] = useState("");

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'account' | 'delete'>('profile');
  const [settingsDisplayName, setSettingsDisplayName] = useState("");
  const [settingsBio, setSettingsBio] = useState("");
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState("");
  const [settingsNewPassword, setSettingsNewPassword] = useState("");
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsMsgType, setSettingsMsgType] = useState<'success' | 'error'>('success');

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Post options dropdown
  const [openPostMenu, setOpenPostMenu] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // ---- WHITEBOARD STATE ----
  const whiteboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<DrawPoint | null>(null);
  const [wbTool, setWbTool] = useState<'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text'>('pen');
  const [wbColor, setWbColor] = useState('#60a5fa');
  const [wbSize, setWbSize] = useState(3);
  const [wbTextInput, setWbTextInput] = useState('');
  const [wbTextPos, setWbTextPos] = useState<DrawPoint | null>(null);
  const [wbTextSegments, setWbTextSegments] = useState<{text: string; color: string}[]>([]);
  const [wbTextActiveColor, setWbTextActiveColor] = useState('#ffffff');
  const [wbTextCanvasPos, setWbTextCanvasPos] = useState<DrawPoint | null>(null);
  const shapeStartRef = useRef<DrawPoint | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const WB_COLORS = ['#ffffff', '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#000000'];

  useEffect(() => {
    const token = document.cookie.includes('token=') || localStorage.getItem('token');
    setIsLoggedIn(!!token);
    const user = localStorage.getItem('username') || "anonymous";
    setUsername(user);
    if (view === "gossip") fetchRooms();
    if (view === "pm") fetchInbox();
    if (view === "developers") fetchCollabs();
    if (view === "communities") fetchCommunities();
    if (view !== "gossip" && view !== "pm" && view !== "developers" && view !== "editor" && view !== "communities") fetchData();
  }, [view, selectedCategory, selectedProfileUser]);

  // Fetch notifications on mount and when username changes
  useEffect(() => {
    if (username && username !== "anonymous") {
      fetchNotifications();
      socket.emit('join-notifications', username);
      socket.on('new-notification', (notif: any) => {
        setNotifications(prev => [notif, ...prev]);
        setUnreadNotifCount(prev => prev + 1);
      });
    }
    return () => { socket.off('new-notification'); };
  }, [username]);

  const fetchNotifications = async () => {
    if (!username || username === "anonymous") return;
    try {
      const res = await fetch(`https://whisper-mi0t.onrender.com/api/notifications/${username}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadNotifCount(Array.isArray(data) ? data.filter((n: any) => !n.read).length : 0);
    } catch {}
  };

  const markAllNotifsRead = async () => {
    await fetch(`https://whisper-mi0t.onrender.com/api/notifications/${username}/read-all`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifCount(0);
  };

  const markNotifRead = async (id: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadNotifCount(prev => Math.max(0, prev - 1));
  };

  const deleteNotif = async (id: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/notifications/${id}`, { method: 'DELETE' });
    const notif = notifications.find(n => n._id === id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (notif && !notif.read) setUnreadNotifCount(prev => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (!selectedRoom) return;
    socket.emit('join-room', selectedRoom._id);
    setRoomMessages(selectedRoom.messages || []);
    const handleNewMessage = (message: any) => { setRoomMessages(prev => [...prev, message]); };
    const handleDeletedMessage = (messageId: string) => { setRoomMessages(prev => prev.filter(m => m.id !== messageId)); };
    socket.on('room-message-received', handleNewMessage);
    socket.on('room-message-deleted', handleDeletedMessage);
    return () => {
      socket.emit('leave-room', selectedRoom._id);
      socket.off('room-message-received', handleNewMessage);
      socket.off('room-message-deleted', handleDeletedMessage);
    };
  }, [selectedRoom?._id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [roomMessages]);

  useEffect(() => {
    if (!selectedRoom) return;
    const calculateTime = () => {
      const created = new Date(selectedRoom.createdAt).getTime();
      const expiry = created + (5 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const diff = expiry - now;
      if (diff <= 0) { setSelectedRoom(null); fetchRooms(); return "Expired"; }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return `${h}h ${m}m ${s}s`;
    };
    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [selectedRoom]);

  useEffect(() => {
    if (view === "editor" && activeCollab) {
      socket.emit('join-editor', activeCollab._id);
      socket.on('code-update', (newCode) => setEditorCode(newCode));
    }
    return () => { socket.off('code-update'); };
  }, [view, activeCollab]);

  useEffect(() => {
    if (view === "editor" && activeCollab && devTab === 'whiteboard') {
      socket.emit('join-whiteboard', activeCollab._id);
      socket.on('whiteboard-draw-update', (drawData: DrawAction) => { replayDraw(drawData); });
      socket.on('whiteboard-cleared', () => { clearCanvas(); });
    }
    return () => { socket.off('whiteboard-draw-update'); socket.off('whiteboard-cleared'); };
  }, [view, activeCollab, devTab]);

  // Close post menu on outside click
  useEffect(() => {
    const handler = () => setOpenPostMenu(null);
    if (openPostMenu) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openPostMenu]);

  // Close mobile sidebar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMobileSidebarOpen && !target.closest('#mobile-sidebar') && !target.closest('#mobile-menu-btn')) {
        setIsMobileSidebarOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isMobileSidebarOpen]);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isNotifPanelOpen && !target.closest('#notif-panel') && !target.closest('#notif-btn')) {
        setIsNotifPanelOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isNotifPanelOpen]);

  const replayDraw = (data: DrawAction) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = data.color || '#60a5fa';
    ctx.fillStyle = data.color || '#60a5fa';
    ctx.lineWidth = data.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (data.type === 'draw' && data.points && data.points.length > 1) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.moveTo(data.points[0].x, data.points[0].y);
      for (let i = 1; i < data.points.length; i++) ctx.lineTo(data.points[i].x, data.points[i].y);
      ctx.stroke();
    } else if (data.type === 'erase' && data.points && data.points.length > 1) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = (data.width || 3) * 5;
      ctx.beginPath(); ctx.moveTo(data.points[0].x, data.points[0].y);
      for (let i = 1; i < data.points.length; i++) ctx.lineTo(data.points[i].x, data.points[i].y);
      ctx.stroke();
    } else if (data.type === 'rect' && data.x !== undefined && data.y !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeRect(data.x, data.y, data.x2 - data.x, data.y2 - data.y);
    } else if (data.type === 'circle' && data.x !== undefined && data.y !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      const rx = Math.abs(data.x2 - data.x) / 2;
      const ry = Math.abs(data.y2 - data.y) / 2;
      ctx.ellipse(data.x + (data.x2 - data.x) / 2, data.y + (data.y2 - data.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (data.type === 'line' && data.x !== undefined && data.y !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.moveTo(data.x, data.y); ctx.lineTo(data.x2, data.y2); ctx.stroke();
    } else if (data.type === 'arrow' && data.x !== undefined && data.y !== undefined && data.x2 !== undefined && data.y2 !== undefined) {
      ctx.globalCompositeOperation = 'source-over';
      drawArrowOnCtx(ctx, data.x, data.y, data.x2, data.y2);
    } else if (data.type === 'text' && data.text && data.x !== undefined && data.y !== undefined) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `${data.fontSize || 18}px 'Cascadia Code', monospace`;
      ctx.fillText(data.text, data.x, data.y);
    }
    ctx.restore();
  };

  const drawArrowOnCtx = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLen = 16;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  };

  const clearCanvas = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleWbMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    if (wbTool === 'text') {
      setWbTextPos({ x: screenX, y: screenY });
      setWbTextCanvasPos({ x, y });
      setWbTextSegments([]); setWbTextInput(''); setWbTextActiveColor(wbColor);
      return;
    }
    isDrawingRef.current = true;
    lastPointRef.current = { x, y };
    shapeStartRef.current = { x, y };
    if (['rect', 'circle', 'line', 'arrow'].includes(wbTool)) {
      const ctx = canvas.getContext('2d');
      if (ctx) snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const currentStrokeRef = useRef<DrawPoint[]>([]);

  const handleWbMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.save();
    ctx.strokeStyle = wbColor; ctx.fillStyle = wbColor; ctx.lineWidth = wbSize;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (wbTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.moveTo(lastPointRef.current!.x, lastPointRef.current!.y); ctx.lineTo(x, y); ctx.stroke();
      currentStrokeRef.current.push({ x, y });
    } else if (wbTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = wbSize * 5;
      ctx.beginPath(); ctx.moveTo(lastPointRef.current!.x, lastPointRef.current!.y); ctx.lineTo(x, y); ctx.stroke();
      currentStrokeRef.current.push({ x, y });
    } else if (['rect', 'circle', 'line', 'arrow'].includes(wbTool)) {
      ctx.globalCompositeOperation = 'source-over';
      if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
      const sx = shapeStartRef.current!.x; const sy = shapeStartRef.current!.y;
      ctx.restore(); ctx.save(); ctx.strokeStyle = wbColor; ctx.fillStyle = wbColor;
      ctx.lineWidth = wbSize; ctx.lineCap = 'round';
      if (wbTool === 'rect') { ctx.strokeRect(sx, sy, x - sx, y - sy); }
      else if (wbTool === 'circle') {
        ctx.beginPath(); ctx.ellipse(sx + (x - sx) / 2, sy + (y - sy) / 2, Math.abs(x - sx) / 2, Math.abs(y - sy) / 2, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (wbTool === 'line') { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke(); }
      else if (wbTool === 'arrow') { drawArrowOnCtx(ctx, sx, sy, x, y); }
    }
    lastPointRef.current = { x, y }; ctx.restore();
  };

  const handleWbMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current && wbTool !== 'text') return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX; const y = (e.clientY - rect.top) * scaleY;
    isDrawingRef.current = false;
    if (!activeCollab) return;
    if (wbTool === 'pen') { socket.emit('whiteboard-draw', { collabId: activeCollab._id, drawData: { type: 'draw', points: currentStrokeRef.current, color: wbColor, width: wbSize } }); }
    else if (wbTool === 'eraser') { socket.emit('whiteboard-draw', { collabId: activeCollab._id, drawData: { type: 'erase', points: currentStrokeRef.current, width: wbSize } }); }
    else if (['rect', 'circle', 'line', 'arrow'].includes(wbTool)) {
      socket.emit('whiteboard-draw', { collabId: activeCollab._id, drawData: { type: wbTool, color: wbColor, width: wbSize, x: shapeStartRef.current!.x, y: shapeStartRef.current!.y, x2: x, y2: y } });
    }
    currentStrokeRef.current = [];
  };

  const handleWbAddSegment = () => {
    if (!wbTextInput.trim()) return;
    setWbTextSegments(prev => [...prev, { text: wbTextInput, color: wbTextActiveColor }]);
    setWbTextInput('');
  };

  const handleWbStampText = () => {
    const allSegs = wbTextInput.trim() ? [...wbTextSegments, { text: wbTextInput, color: wbTextActiveColor }] : wbTextSegments;
    if (allSegs.length === 0 || !wbTextCanvasPos) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const FONT_SIZE = 22;
    ctx.font = `bold ${FONT_SIZE}px 'Cascadia Code', 'Fira Code', monospace`;
    let cx = wbTextCanvasPos.x;
    for (const seg of allSegs) { ctx.fillStyle = seg.color; ctx.fillText(seg.text, cx, wbTextCanvasPos.y); cx += ctx.measureText(seg.text).width; }
    let ex = wbTextCanvasPos.x;
    for (const seg of allSegs) {
      if (activeCollab) { socket.emit('whiteboard-draw', { collabId: activeCollab._id, drawData: { type: 'text', text: seg.text, x: ex, y: wbTextCanvasPos.y, color: seg.color, fontSize: FONT_SIZE } }); }
      ex += ctx.measureText(seg.text).width;
    }
    setWbTextInput(''); setWbTextSegments([]); setWbTextPos(null); setWbTextCanvasPos(null);
  };

  const handleWbTextSubmit = handleWbStampText;

  const handleWbClear = () => {
    clearCanvas();
    if (activeCollab) socket.emit('whiteboard-clear', activeCollab._id);
  };

  const handleCodeChange = (newVal: string | undefined) => {
    const code = newVal || "";
    setEditorCode(code);
    socket.emit('code-change', { collabId: activeCollab._id, code });
  };

  const fetchCollabs = async () => {
    const res = await fetch('https://whisper-mi0t.onrender.com/api/collabs');
    setCollabs(await res.json());
  };

  const handleCreateCollab = async () => {
    await fetch('https://whisper-mi0t.onrender.com/api/collabs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCollabData, admin: username, members: [{ username, displayName: username }] })
    });
    setIsCreateCollabOpen(false); setNewCollabData({ title: "", description: "", techStack: "", password: "" }); fetchCollabs();
  };

  const joinCollab = (collab: any) => { setCollabJoinModal(collab); setCollabJoinPassword(""); setCollabJoinNickname(""); };

  const handleCollabJoinSubmit = async () => {
    if (!collabJoinModal) return;
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/collabs/${collabJoinModal._id}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName: collabJoinNickname.trim() || username, password: collabJoinPassword })
    });
    if (res.ok) { setCollabJoinModal(null); fetchCollabs(); }
    else { const data = await res.json(); alert(data.msg || "Failed to join"); }
  };

  const deleteCollab = async (id: string) => {
    if (confirm("Delete this collab?")) { await fetch(`https://whisper-mi0t.onrender.com/api/collabs/${id}`, { method: 'DELETE' }); fetchCollabs(); }
  };

  const handleOpenEditor = (collab: any) => { setEditorPasswordModal(collab); setEditorPasswordInput(""); setEditorPasswordError(""); };

  const handleEditorPasswordSubmit = async () => {
    if (!editorPasswordModal) return;
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/collabs/${editorPasswordModal._id}/verify-editor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: editorPasswordInput, username })
    });
    if (res.ok) {
      setActiveCollab(editorPasswordModal); setEditorCode(editorPasswordModal.code || "// Start Coding..."); setDevTab('code'); setView("editor"); setEditorPasswordModal(null);
    } else { const data = await res.json(); setEditorPasswordError(data.msg || "Incorrect password"); }
  };

  // ---- COMMUNITIES ----
  const fetchCommunities = async () => {
    const res = await fetch('https://whisper-mi0t.onrender.com/api/communities');
    setCommunities(await res.json());
  };

  const fetchCommunityDetail = async (id: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/communities/${id}`);
    const data = await res.json();
    setActiveCommunity(data);
    setCommunityView('detail');
  };

  const handleCreateCommunity = async () => {
    const res = await fetch('https://whisper-mi0t.onrender.com/api/communities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCommunityData, admin: username })
    });
    if (res.ok) {
      setIsCreateCommunityOpen(false);
      setNewCommunityData({ name: "", description: "", topic: "Technology", password: "" });
      fetchCommunities();
    }
  };

  // Updated: now sends join request (notification to admin) instead of direct join
  const handleJoinCommunity = async (community: any) => {
    if (community.password && community.admin !== username) {
      setJoinPasswordModal(community);
      setJoinPasswordInput("");
      return;
    }
    await doRequestJoinCommunity(community._id, "");
  };

  const doRequestJoinCommunity = async (communityId: string, password: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/communities/${communityId}/request-join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      setJoinPasswordModal(null);
      fetchCommunities();
      if (activeCommunity?._id === communityId) fetchCommunityDetail(communityId);
      if (data.msg === 'joined') {
        alert("You joined as admin!");
      } else if (data.msg === 'already_member') {
        alert("You are already a member!");
      } else if (data.msg === 'already_requested') {
        alert("Your join request is already pending. Wait for admin approval.");
      } else {
        alert("Join request sent! Wait for admin approval.");
      }
    } else { const data = await res.json(); alert(data.msg || "Failed to send join request"); }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/communities/${communityId}/leave`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    fetchCommunities();
    if (activeCommunity?._id === communityId) { setCommunityView('list'); setActiveCommunity(null); }
  };

  const handleApproveCommunityRequest = async (communityId: string, requesterUsername: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/communities/${communityId}/requests/${requesterUsername}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      fetchCommunityDetail(communityId);
    }
  };

  const handleRejectCommunityRequest = async (communityId: string, requesterUsername: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/communities/${communityId}/requests/${requesterUsername}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      fetchCommunityDetail(communityId);
    }
  };

  const handleCommunityPost = async () => {
    if (!communityPostInput.trim() && communityMedia.length === 0) return;
    await fetch(`https://whisper-mi0t.onrender.com/api/communities/${activeCommunity._id}/posts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, content: communityPostInput, media: communityMedia })
    });
    setCommunityPostInput(""); setCommunityMedia([]);
    fetchCommunityDetail(activeCommunity._id);
  };

  const handleCommunityFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommunityMedia(prev => [...prev, { url: reader.result as string, fileType: file.type, fileName: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCommunityLike = async (postId: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/communities/${activeCommunity._id}/posts/${postId}/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    fetchCommunityDetail(activeCommunity._id);
  };

  const handleCommunityComment = async () => {
    if (!communityCommentInput.trim() || !communityCommentModal) return;
    await fetch(`https://whisper-mi0t.onrender.com/api/communities/${activeCommunity._id}/posts/${communityCommentModal._id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, text: communityCommentInput })
    });
    setCommunityCommentInput("");
    await fetchCommunityDetail(activeCommunity._id);
    const updated = activeCommunity.posts?.find((p: any) => p._id === communityCommentModal._id);
    if (updated) setCommunityCommentModal(updated);
  };

  const deleteCommunityPost = async (postId: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/communities/${activeCommunity._id}/posts/${postId}`, { method: 'DELETE' });
    fetchCommunityDetail(activeCommunity._id);
  };

  const deleteCommunity = async (id: string) => {
    if (confirm("Delete this community?")) {
      await fetch(`https://whisper-mi0t.onrender.com/api/communities/${id}`, { method: 'DELETE' });
      fetchCommunities();
      if (activeCommunity?._id === id) { setCommunityView('list'); setActiveCommunity(null); }
    }
  };
  // ---- END COMMUNITIES ----

  const fetchData = async () => {
    let url = 'https://whisper-mi0t.onrender.com/api/thoughts';
    if (view === "home") url = 'https://whisper-mi0t.onrender.com/api/thoughts/recent'; 
    else if (view === "popular") url = 'https://whisper-mi0t.onrender.com/api/thoughts/popular'; 
    else if (view === "workspace") url = `https://whisper-mi0t.onrender.com/api/thoughts/user/${username}`;
    else if (view === "profile" && selectedProfileUser) url = `https://whisper-mi0t.onrender.com/api/thoughts/user/${selectedProfileUser}`;
    else if (view === "explore") url = selectedCategory === "All" ? 'https://whisper-mi0t.onrender.com/api/thoughts' : `https://whisper-mi0t.onrender.com/api/thoughts/category/${selectedCategory}`;
    const res = await fetch(url);
    const data = await res.json();
    const formattedData = Array.isArray(data) ? data : [];
    setThoughts(formattedData);
    if (commentModalPost) {
      const updatedPost = formattedData.find((p: any) => p._id === commentModalPost._id);
      if (updatedPost) setCommentModalPost(updatedPost);
    }
  };

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        const res = await fetch(`https://whisper-mi0t.onrender.com/api/users/search?q=${searchQuery}`);
        setUserSearchResults(await res.json());
      } else setUserSearchResults([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const openUserProfile = (targetUser: string) => {
    if (targetUser === username) setView("workspace");
    else { setSelectedProfileUser(targetUser); setView("profile"); }
    setSearchQuery("");
    setIsMobileSidebarOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) { alert("Max 5 images."); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (videos.length + files.length > 2) { alert("Max 2 videos."); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setVideos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleFilePostUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPostFiles(prev => [...prev, { url: reader.result as string, fileName: file.name, fileType: file.type }]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));
  const removeVideo = (index: number) => setVideos(prev => prev.filter((_, i) => i !== index));
  const removePostFile = (index: number) => setPostFiles(prev => prev.filter((_, i) => i !== index));

  const handleInteraction = async (id: string, type: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/thoughts/${id}/${type}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username })
    });
    if (res.ok) fetchData();
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || !commentModalPost || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`https://whisper-mi0t.onrender.com/api/thoughts/${commentModalPost._id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || "Anonymous", text: commentInput.trim() })
      });
      if (res.ok) {
        const updatedThought = await res.json();
        setCommentInput("");
        setCommentModalPost(updatedThought);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.msg || "Failed to post comment");
      }
    } catch (e) {
      alert("Network error. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleShare = (text: string) => {
    if (navigator.share) navigator.share({ title: 'Whisper.io Secret', text, url: window.location.href });
    else { navigator.clipboard.writeText(text); alert("Secret copied to clipboard!"); }
  };

  const fetchRooms = async () => { const res = await fetch('https://whisper-mi0t.onrender.com/api/rooms'); setRooms(await res.json()); };

  const deleteRoom = async (id: string) => {
    if (confirm("Admin Action: Delete this room?")) { await fetch(`https://whisper-mi0t.onrender.com/api/rooms/${id}`, { method: 'DELETE' }); fetchRooms(); }
  };

  const deletePost = async (id: string) => {
    if (confirm("Delete this secret permanently?")) { await fetch(`https://whisper-mi0t.onrender.com/api/thoughts/${id}`, { method: 'DELETE' }); fetchData(); }
  };

  const deleteAccount = async () => {
    if (confirm("WARNING: Delete account permanently? This cannot be undone.")) {
      const res = await fetch(`https://whisper-mi0t.onrender.com/api/users/${username}`, { method: 'DELETE' });
      if (res.ok) handleLogout();
    }
  };

  const joinRoom = async (room: any) => {
    if (room.password && room.admin !== username) {
      const pass = prompt("Enter room password:");
      if (pass !== room.password) { alert("Incorrect password. Access denied."); return; }
    }
    setNicknamePendingRoom(room); setNicknameChoice("original"); setCustomNickname("");
    const shuffled = [...NICKNAME_SUGGESTIONS].sort(() => 0.5 - Math.random());
    setSelectedNickname(shuffled[0]);
  };

  const confirmJoinRoom = () => {
    if (!nicknamePendingRoom) return;
    let displayName = username;
    if (nicknameChoice === "new") displayName = customNickname.trim() || selectedNickname;
    setRoomDisplayName(displayName); setSelectedRoom(nicknamePendingRoom);
    setRoomMessages(nicknamePendingRoom.messages || []); setNicknamePendingRoom(null);
  };

  const sendRoomMessage = async (mediaData: any = null) => {
    if (!chatInput.trim() && !mediaData) return;
    const msgText = chatInput; setChatInput("");
    await fetch(`https://whisper-mi0t.onrender.com/api/rooms/${selectedRoom._id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: roomDisplayName || username, text: msgText, media: mediaData })
    });
  };

  const handleRoomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => sendRoomMessage({ url: reader.result as string, fileType: file.type, fileName: file.name }); reader.readAsDataURL(file); }
  };

  const deleteRoomMsg = async (msgId: string) => {
    await fetch(`https://whisper-mi0t.onrender.com/api/rooms/${selectedRoom._id}/messages/${msgId}`, { method: 'DELETE' });
  };

  const fetchInbox = async () => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/messages/inbox/${username}`);
    setInbox(await res.json());
  };

  const fetchPMs = async (recipient: string) => {
    const res = await fetch(`https://whisper-mi0t.onrender.com/api/messages/${username}/${recipient}`);
    setPrivateMessages(await res.json());
  };

  const handleSendPM = async (mediaData: any = null) => {
    if (!pmText.trim() && !mediaData || !selectedRecipient) return;
    await fetch('https://whisper-mi0t.onrender.com/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: username, receiver: selectedRecipient, text: pmText, media: mediaData })
    });
    setPmText(""); fetchPMs(selectedRecipient);
  };

  const handlePMFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => handleSendPM({ url: reader.result as string, fileType: file.type, fileName: file.name }); reader.readAsDataURL(file); }
  };

  const deleteChat = async () => {
    if (!selectedRecipient) return;
    if (confirm(`Clear all messages with @${selectedRecipient}? This will only clear them from your account.`)) {
      await fetch(`https://whisper-mi0t.onrender.com/api/messages/${username}/${selectedRecipient}`, { method: 'DELETE' });
      setPrivateMessages([]);
      setSelectedRecipient(null);
      fetchInbox();
    }
  };

  const handlePost = async () => {
    if (!input.trim() && images.length === 0 && videos.length === 0 && postFiles.length === 0) return;
    const url = editingId ? `https://whisper-mi0t.onrender.com/api/thoughts/${editingId}` : 'https://whisper-mi0t.onrender.com/api/thoughts';
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, mood: selectedMood, category: selectedCategory, username, images, videos, files: postFiles })
    });
    if (res.ok) { setInput(""); setImages([]); setVideos([]); setPostFiles([]); setEditingId(null); setIsProfileOpen(false); fetchData(); }
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  const handleChangePassword = async () => {
    setSettingsMsg("");
    if (!settingsCurrentPassword || !settingsNewPassword) {
      setSettingsMsgType('error'); setSettingsMsg("All fields required"); return;
    }
    if (settingsNewPassword !== settingsConfirmPassword) {
      setSettingsMsgType('error'); setSettingsMsg("Passwords don't match"); return;
    }
    if (settingsNewPassword.length < 6) {
      setSettingsMsgType('error'); setSettingsMsg("New password must be at least 6 characters"); return;
    }
    try {
      const res = await fetch('https://whisper-mi0t.onrender.com/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, currentPassword: settingsCurrentPassword, newPassword: settingsNewPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsMsgType('success'); setSettingsMsg("Password updated successfully!");
        setSettingsCurrentPassword(""); setSettingsNewPassword(""); setSettingsConfirmPassword("");
        setTimeout(() => setSettingsMsg(""), 3000);
      } else { setSettingsMsgType('error'); setSettingsMsg(data.msg || "Failed to update password"); }
    } catch (err) { setSettingsMsgType('error'); setSettingsMsg("Network error. Please try again."); }
  };

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchUser.trim()) {
        const res = await fetch(`https://whisper-mi0t.onrender.com/api/users/search?q=${searchUser}`);
        setFoundUsers(await res.json());
      } else setFoundUsers([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchUser]);

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'message': return '💬';
      case 'room_invite': return '🚪';
      case 'community_join_request': return '🙋';
      case 'community_approved': return '✅';
      case 'community_rejected': return '❌';
      case 'post_like': return '❤️';
      case 'post_comment': return '💭';
      default: return '🔔';
    }
  };

  const navItems = [
    { id: "home", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>), label: "Home" },
    { id: "explore", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>), label: "Explore" },
    { id: "popular", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>), label: "Popular" },
    { id: "workspace", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>), label: "My Workspace" },
  ];

  const navItems2 = [
    { id: "gossip", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>), label: "Gossip Rooms" },
    { id: "pm", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>), label: "Private Messages" },
    { id: "communities", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>), label: "Communities" },
    { id: "developers", icon: (<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>), label: "Dev Platform" },
  ];

  // Filter communities by search query
  const filteredCommunities = communities.filter(c =>
    communitySearchQuery.trim() === '' ||
    c.name?.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
    c.topic?.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(communitySearchQuery.toLowerCase())
  );

  // Filter community detail posts by search
  const filteredCommunityPosts = activeCommunity?.posts?.filter((p: any) =>
    communityDetailSearchQuery.trim() === '' ||
    p.content?.toLowerCase().includes(communityDetailSearchQuery.toLowerCase()) ||
    p.username?.toLowerCase().includes(communityDetailSearchQuery.toLowerCase())
  ) || [];

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-3 py-3 mb-2 cursor-pointer" onClick={() => { setView("home"); setMoodFilter("All"); setIsMobileSidebarOpen(false); }}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        </div>
        <h1 className="text-[15px] font-black italic text-white tracking-tight">Whisper<span className="text-blue-400">.io</span></h1>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setView(item.id); if (item.id === "home") setMoodFilter("All"); setIsMobileSidebarOpen(false); }}
            className={`nav-btn flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold w-full text-left ${view === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}>
            <span className={view === item.id ? 'text-blue-400' : ''}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="my-2 border-t border-zinc-900" />
      <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Social</p>

      <nav className="flex flex-col gap-0.5">
        {navItems2.map(item => (
          <button key={item.id} onClick={() => { setView(item.id); if (item.id === "communities") { setCommunityView('list'); fetchCommunities(); } setIsMobileSidebarOpen(false); }}
            className={`nav-btn flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold w-full text-left ${view === item.id || (view === 'editor' && item.id === 'developers') ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}>
            <span className={view === item.id ? 'text-blue-400' : ''}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {/* User info + notifications + settings - all grouped at bottom */}
        <div className="flex items-center gap-2 mb-2">
          {/* Notification button */}
          <button
            id="notif-btn"
            onClick={() => { setIsNotifPanelOpen(v => !v); setIsMobileSidebarOpen(false); }}
            className="relative flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:bg-zinc-800 transition-all"
            title="Notifications"
          >
            <div className="relative">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-zinc-400">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center text-white leading-none">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </div>
            <span className="text-[12px] font-semibold text-zinc-400">Notifications</span>
          </button>
          {/* Settings button */}
          <button onClick={() => { setIsSettingsOpen(true); setIsMobileSidebarOpen(false); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 border border-zinc-800/60 bg-zinc-900/60 transition-all flex-shrink-0" title="Settings">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-xs font-black flex-shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold truncate">@{username}</p>
            <p className="text-[10px] text-zinc-500">{selectedMood}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full mt-2 text-[11px] text-zinc-600 hover:text-red-500 font-bold uppercase tracking-wider py-1 transition-colors">Sign Out</button>
      </div>
    </>
  );

  // Media renderer helper
  const renderMediaItem = (item: {url: string; fileType: string; fileName?: string}, idx: number) => {
    if (item.fileType?.startsWith('image')) {
      return <img key={idx} src={item.url} className="rounded-xl max-h-52 cursor-zoom-in hover:brightness-110 transition w-full object-cover" onClick={() => setZoomedImage(item.url)} />;
    } else if (item.fileType?.startsWith('video')) {
      return <video key={idx} src={item.url} controls className="rounded-xl max-h-52 w-full" />;
    } else {
      return (
        <a key={idx} href={item.url} download={item.fileName || 'file'} className="flex items-center gap-2 text-xs font-bold text-blue-200 bg-blue-700/30 px-3 py-2 rounded-lg border border-blue-400/30 hover:bg-blue-600/50 transition">
          📎 {item.fileName || 'Download File'}
        </a>
      );
    }
  };

  const showSearchBar = view === "home" || view === "explore" || view === "popular";

  return (
    <div className="flex bg-[#0a0a0a] text-white" style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .post-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .post-card:hover { border-color: rgba(255,255,255,0.08); box-shadow: 0 4px 32px rgba(0,0,0,0.4); }
        .vote-btn { transition: all 0.15s; }
        .vote-btn:hover { transform: scale(1.1); }
        .nav-btn { transition: all 0.15s; }
        .sidebar-glow { background: linear-gradient(180deg, rgba(96,165,250,0.03) 0%, transparent 100%); }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .feed-item { animation: fadeSlideIn 0.3s ease both; }
        @keyframes notifSlideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        .notif-item { animation: notifSlideIn 0.2s ease both; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-topbar { display: none !important; }
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>

      {/* MOBILE TOP BAR */}
      <div className="mobile-topbar fixed top-0 left-0 right-0 z-[200] bg-[#0a0a0a] border-b border-zinc-900 px-4 py-3 items-center justify-between" style={{ display: 'none' }}>
        <button id="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="flex items-center gap-2" onClick={() => { setView("home"); setMoodFilter("All"); }}>
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
          </div>
          <h1 className="text-[14px] font-black italic text-white">Whisper<span className="text-blue-400">.io</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button id="notif-btn" onClick={() => setIsNotifPanelOpen(v => !v)} className="relative w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
          </button>
          <button onClick={() => { setIsProfileOpen(true); setEditingId(null); setInput(""); setImages([]); setVideos([]); setPostFiles([]); }}
            className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-[190] md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <div id="mobile-sidebar"
        className={`fixed top-0 left-0 h-full w-[260px] bg-[#0a0a0a] border-r border-zinc-900 z-[195] flex flex-col gap-2 p-4 sidebar-glow transition-transform duration-300 md:hidden overflow-y-auto ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* DESKTOP SIDEBAR — sticky, never scrolls */}
      <aside className="desktop-sidebar w-[256px] border-r border-zinc-900/80 p-4 flex-col gap-2 sticky top-0 h-screen sidebar-glow flex-shrink-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* NOTIFICATIONS PANEL */}
      {isNotifPanelOpen && (
        <div
          id="notif-panel"
          className="fixed left-[264px] bottom-16 z-[300] w-[340px] max-h-[520px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.8)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="font-black text-sm text-white">Notifications</span>
              {unreadNotifCount > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unreadNotifCount} new</span>}
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <button onClick={markAllNotifsRead} className="text-[10px] text-blue-400 font-bold hover:text-blue-300 transition">Mark all read</button>
              )}
              <button onClick={() => setIsNotifPanelOpen(false)} className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white transition text-xs">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {notifications.length === 0 && (
              <div className="py-14 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No notifications yet</p>
              </div>
            )}
            {notifications.map((n: any, i: number) => (
              <div
                key={n._id}
                className={`notif-item flex items-start gap-3 px-4 py-3 border-b border-zinc-900/60 hover:bg-zinc-900/40 transition group cursor-pointer ${!n.read ? 'bg-blue-950/10' : ''}`}
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => { markNotifRead(n._id); if (n.link) { setView(n.link.replace('/', '') || 'home'); setIsNotifPanelOpen(false); } }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${!n.read ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-zinc-800/60 border border-zinc-700/40'}`}>
                  {getNotifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold leading-tight ${!n.read ? 'text-white' : 'text-zinc-300'}`}>{n.title}</p>
                  {n.body && <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-zinc-600 mt-1">{relativeTime(n.createdAt)}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition text-xs w-5 h-5 flex items-center justify-center rounded"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA — flex column, fixed height, inner feed scrolls */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Mobile spacer */}
        <div className="h-[57px] md:hidden flex-shrink-0" />

        {/* STICKY TOP SECTION: search bar + filters — only for home/explore/popular */}
        {showSearchBar && (
          <div className="flex-shrink-0 bg-[#0a0a0a] border-b border-zinc-900/60 z-[50]">
            <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-4 pb-3">
              {/* SEARCH BAR */}
              <div className="relative z-[100] mb-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" placeholder="Search whispers or @usernames…"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                {userSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase px-4 pt-3 pb-1 tracking-widest">Users</p>
                    {userSearchResults.map((u: any) => (
                      <div key={u._id} onClick={() => openUserProfile(u.username)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900 cursor-pointer transition">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-xs font-black">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">@{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MOOD FILTER BAR */}
              {view === "home" && (
                <HScrollWithArrows>
                  <button onClick={() => setMoodFilter("All")}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${moodFilter === "All" ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}`}>
                    🌈 All
                  </button>
                  {MOODS.map(m => (
                    <button key={m.label} onClick={() => setMoodFilter(m.emoji)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${moodFilter === m.emoji ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}`}>
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </HScrollWithArrows>
              )}

              {/* EXPLORE CATEGORIES */}
              {view === "explore" && (
                <HScrollWithArrows>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all ${selectedCategory === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}>
                      {cat === "All" ? "🌍 Global" : `# ${cat}`}
                    </button>
                  ))}
                </HScrollWithArrows>
              )}
            </div>
          </div>
        )}

        {/* Thin top padding for non-search-bar views */}
        {!showSearchBar && (
          <div className="flex-shrink-0 h-4 md:h-4" />
        )}

        {/* SCROLLABLE FEED AREA */}
        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ minHeight: 0 }}>
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4">

            {/* PROFILE HEADER VIEW */}
            {view === "profile" && selectedProfileUser && (
              <div className="border border-zinc-800 rounded-2xl mb-6 overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-blue-900/40 via-violet-900/30 to-zinc-900" />
                <div className="px-4 sm:px-6 pb-5 -mt-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-2xl font-black border-4 border-[#0a0a0a] mb-3">
                    {selectedProfileUser.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-end justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-black">@{selectedProfileUser}</h2>
                      <p className="text-xs text-zinc-500">Whisper.io member</p>
                    </div>
                    <button onClick={() => { setSelectedRecipient(selectedProfileUser); setView("pm"); fetchPMs(selectedProfileUser); }}
                      className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-bold text-[12px] uppercase tracking-wider transition">Message</button>
                  </div>
                </div>
              </div>
            )}

            {/* GOSSIP SECTION */}
            {view === "gossip" && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 100px)' , display: 'flex', flexDirection: 'column' }}>
                {!selectedRoom ? (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-4 sm:p-5 border-b border-zinc-800 flex-wrap gap-2 flex-shrink-0">
                      <div>
                        <h2 className="text-lg font-black">Gossip Rooms</h2>
                        <p className="text-xs text-zinc-500">Rooms expire in 5 hours</p>
                      </div>
                      <button onClick={() => setIsCreateRoomOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">+ Create Room</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start no-scrollbar">
                      {rooms.map(r => (
                        <div key={r._id} onClick={() => joinRoom(r)} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-600 transition group relative">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-sm text-blue-400 group-hover:text-blue-300">#{r.name}</h3>
                            <div className="flex items-center gap-1.5">
                              {r.password && <span className="text-[10px] text-yellow-400">🔒</span>}
                              {r.admin === username && (
                                <button onClick={(e) => { e.stopPropagation(); deleteRoom(r._id); }} className="text-red-500 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition">✕</button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{r.description}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] text-zinc-500 font-medium">Live · Expires in 5h</span>
                          </div>
                        </div>
                      ))}
                      {rooms.length === 0 && <div className="col-span-2 py-16 text-center text-zinc-600 text-sm">No rooms yet. Be the first to create one!</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setSelectedRoom(null); setRoomMessages([]); }} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <div>
                          <p className="font-bold text-sm">#{selectedRoom.name}</p>
                          <p className="text-[10px] text-zinc-500">Admin: @{selectedRoom.admin}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-red-400 font-bold animate-pulse">{timeLeft}</p>
                        {roomDisplayName !== username && roomDisplayName && <p className="text-[10px] text-blue-400">You: @{roomDisplayName}</p>}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 no-scrollbar">
                      {roomMessages.map((m: any, i: number) => {
                        const isMine = m.username === (roomDisplayName || username);
                        return (
                          <div key={m.id || i} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} group`}>
                            {!isMine && <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">{m.username.charAt(0).toUpperCase()}</div>}
                            <div className={`relative max-w-[80%] sm:max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                              {!isMine && <p className="text-[10px] text-zinc-500 px-1">{m.username}</p>}
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-blue-600 rounded-br-sm' : 'bg-zinc-800 rounded-bl-sm'}`}>
                                {m.text && <p>{m.text}</p>}
                                {m.media && (
                                  <div className="mt-1.5">
                                    {m.media.fileType?.startsWith('image') ? <img src={m.media.url} className="rounded-xl max-h-52 cursor-zoom-in" onClick={() => setZoomedImage(m.media.url)} /> :
                                     m.media.fileType?.startsWith('video') ? <video src={m.media.url} controls className="rounded-xl max-h-52" /> :
                                     <a href={m.media.url} download={m.media.fileName} className="flex items-center gap-2 text-xs text-blue-200 bg-blue-700/30 px-2 py-1.5 rounded-lg border border-blue-400/30">📎 {m.media.fileName || 'File'}</a>}
                                  </div>
                                )}
                              </div>
                              {isMine && <button onClick={() => deleteRoomMsg(m.id)} className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition px-1">Delete</button>}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t border-zinc-800 flex-shrink-0">
                      <div className="flex gap-2 bg-zinc-900 rounded-xl border border-zinc-800 px-3 py-2 items-center">
                        <button onClick={() => roomFileRef.current?.click()} className="text-zinc-500 hover:text-zinc-300 transition flex-shrink-0">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </button>
                        <input type="file" hidden ref={roomFileRef} accept="image/*,video/*,application/*,.pdf,.zip,.txt" onChange={handleRoomFileUpload} />
                        <input type="text" className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" placeholder="Say something…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendRoomMessage()} />
                        <button onClick={() => sendRoomMessage()} className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition flex-shrink-0">
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PM SECTION */}
            {view === "pm" && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                {!selectedRecipient ? (
                  <div className="flex flex-col h-full">
                    <div className="p-4 sm:p-5 border-b border-zinc-800 flex-shrink-0">
                      <h2 className="text-lg font-black mb-3">Private Messages</h2>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                        <input type="text" placeholder="Find a user…" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" value={searchUser} onChange={e => setSearchUser(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                      {inbox.map(chat => (
                        <div key={chat} onClick={() => { setSelectedRecipient(chat); fetchPMs(chat); }} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-zinc-900/50 cursor-pointer transition border-b border-zinc-900/50">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0">{chat.charAt(0).toUpperCase()}</div>
                          <div className="flex-1 min-w-0"><p className="font-semibold text-sm">@{chat}</p><p className="text-[11px] text-zinc-500">Tap to view messages</p></div>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 flex-shrink-0" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      ))}
                      {foundUsers.map((u: any) => (
                        <div key={u._id} onClick={() => { setSelectedRecipient(u.username); fetchPMs(u.username); }} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-zinc-900/50 cursor-pointer transition border-b border-zinc-900/50">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center font-black text-sm flex-shrink-0">{u.username.charAt(0).toUpperCase()}</div>
                          <div><p className="font-semibold text-sm">@{u.username}</p><p className="text-[11px] text-blue-400">Search result</p></div>
                        </div>
                      ))}
                      {inbox.length === 0 && foundUsers.length === 0 && <div className="py-16 text-center text-zinc-600 text-sm">No conversations yet.<br/>Search for a user to start chatting.</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                      <button onClick={() => setSelectedRecipient(null)} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center font-black text-sm">{selectedRecipient.charAt(0).toUpperCase()}</div>
                      <p className="font-bold text-sm flex-1 truncate">@{selectedRecipient}</p>
                      <button onClick={deleteChat} className="text-[11px] text-red-500 font-bold hover:text-red-400 transition flex-shrink-0">Clear</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 no-scrollbar">
                      {privateMessages.map((m: any) => {
                        const isMine = m.sender === username;
                        return (
                          <div key={m._id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                            <div className={`max-w-[80%] sm:max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-blue-600 rounded-br-sm' : 'bg-zinc-800 rounded-bl-sm'}`}>
                              {m.text && <p>{m.text}</p>}
                              {m.media?.url && (
                                <div className="mt-1.5">
                                  {m.media.fileType?.startsWith('image') ? <img src={m.media.url} onClick={() => setZoomedImage(m.media.url)} className="rounded-xl max-h-52 cursor-zoom-in hover:brightness-110 transition" /> :
                                   m.media.fileType?.startsWith('video') ? <video src={m.media.url} controls className="rounded-xl max-h-52 w-full" /> :
                                   <a href={m.media.url} download={m.media.fileName} className="flex items-center gap-2 text-xs font-bold text-blue-200 bg-blue-700/40 px-3 py-1.5 rounded-lg border border-blue-400/30 hover:bg-blue-600/60 transition">📎 {m.media.fileName || 'Download File'}</a>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-zinc-800 flex-shrink-0">
                      <div className="flex gap-2 bg-zinc-900 rounded-xl border border-zinc-800 px-3 py-2 items-center">
                        <button onClick={() => pmFileRef.current?.click()} className="text-zinc-500 hover:text-zinc-300 transition flex-shrink-0">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        </button>
                        <input type="file" hidden ref={pmFileRef} accept="image/*,video/*,application/*,.pdf,.zip,.txt,.doc,.docx" onChange={handlePMFileUpload} />
                        <input type="text" className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600" placeholder="Type a message…" value={pmText} onChange={e => setPmText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendPM()} />
                        <button onClick={() => handleSendPM()} className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition flex-shrink-0">
                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITIES SECTION */}
            {view === "communities" && (
              <div style={{ minHeight: 'calc(100vh - 100px)' }}>
                {communityView === 'list' && (
                  <div>
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                      <div>
                        <h2 className="text-xl font-black text-blue-400">Communities</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Join or create topic-based communities</p>
                      </div>
                      <button onClick={() => setIsCreateCommunityOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">+ Create</button>
                    </div>

                    {/* Community search bar */}
                    <div className="relative mb-4">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search communities by name, topic…"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition placeholder:text-zinc-600"
                        value={communitySearchQuery}
                        onChange={e => setCommunitySearchQuery(e.target.value)}
                      />
                      {communitySearchQuery && (
                        <button onClick={() => setCommunitySearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition text-xs">✕</button>
                      )}
                    </div>

                    {filteredCommunities.length === 0 && (
                      <div className="py-20 text-center text-zinc-600 text-sm">
                        {communitySearchQuery ? `No communities matching "${communitySearchQuery}"` : 'No communities yet. Create one!'}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCommunities.map(c => {
                        const isMember = c.members?.find((m: any) => m.username === username);
                        const hasPendingRequest = c.joinRequests?.find((r: any) => r.username === username);
                        return (
                          <div key={c._id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group">
                            <div className="h-16 bg-gradient-to-r from-blue-900/40 via-violet-900/30 to-zinc-800 relative">
                              <div className="absolute bottom-[-20px] left-4 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-lg font-black border-2 border-[#0a0a0a]">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="px-4 pt-7 pb-4">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <h3 className="font-black text-sm">{c.name}</h3>
                                  <p className="text-[10px] text-blue-400 font-bold">#{c.topic}</p>
                                </div>
                                {c.password && <span className="text-[10px] text-yellow-400">🔒</span>}
                              </div>
                              <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{c.description}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500">{c.members?.length || 0} members</span>
                                <div className="flex gap-2">
                                  <button onClick={() => fetchCommunityDetail(c._id)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition">View</button>
                                  {!isMember ? (
                                    hasPendingRequest ? (
                                      <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase">Pending</span>
                                    ) : (
                                      <button onClick={() => handleJoinCommunity(c)} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition">Request Join</button>
                                    )
                                  ) : (
                                    <button onClick={() => handleLeaveCommunity(c._id)} className="bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition">Leave</button>
                                  )}
                                  {c.admin === username && (
                                    <button onClick={() => deleteCommunity(c._id)} className="text-red-500 text-[10px] font-bold hover:text-red-400 transition">Delete</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {communityView === 'detail' && activeCommunity && (
                  <div>
                    {/* Community header */}
                    <div className="border border-zinc-800 rounded-2xl mb-5 overflow-hidden">
                      <div className="h-24 bg-gradient-to-r from-blue-900/50 via-violet-900/40 to-zinc-900 relative">
                        <div className="absolute bottom-[-24px] left-5 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-xl font-black border-2 border-[#0a0a0a]">
                          {activeCommunity.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="px-5 pt-8 pb-4">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div>
                            <h2 className="text-xl font-black">{activeCommunity.name}</h2>
                            <p className="text-xs text-blue-400 font-bold">#{activeCommunity.topic}</p>
                            <p className="text-xs text-zinc-500 mt-1">{activeCommunity.description}</p>
                            <p className="text-[10px] text-zinc-600 mt-1">{activeCommunity.members?.length || 0} members · Admin: @{activeCommunity.admin}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setCommunityView('list'); setActiveCommunity(null); setCommunityDetailSearchQuery(''); }}
                              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">← Back</button>
                            {activeCommunity.members?.find((m: any) => m.username === username) ? (
                              <button onClick={() => handleLeaveCommunity(activeCommunity._id)} className="bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-300 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">Leave</button>
                            ) : activeCommunity.joinRequests?.find((r: any) => r.username === username) ? (
                              <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-4 py-2 rounded-lg text-xs font-bold uppercase">Pending</span>
                            ) : (
                              <button onClick={() => handleJoinCommunity(activeCommunity)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">Request Join</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin: join requests panel */}
                    {activeCommunity.admin === username && activeCommunity.joinRequests && activeCommunity.joinRequests.length > 0 && (
                      <div className="bg-yellow-950/20 border border-yellow-800/40 rounded-2xl p-4 mb-5">
                        <p className="text-[11px] font-bold uppercase text-yellow-400 tracking-widest mb-3 flex items-center gap-2">
                          <span>🙋</span> Join Requests ({activeCommunity.joinRequests.length})
                        </p>
                        <div className="space-y-2">
                          {activeCommunity.joinRequests.map((req: any) => (
                            <div key={req.username} className="flex items-center gap-3 bg-zinc-900/60 rounded-xl px-3 py-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-600 to-orange-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                                {req.username.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-sm font-bold flex-1">@{req.username}</p>
                              <p className="text-[10px] text-zinc-500">{relativeTime(req.requestedAt)}</p>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleApproveCommunityRequest(activeCommunity._id, req.username)}
                                  className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition"
                                >✓ Approve</button>
                                <button
                                  onClick={() => handleRejectCommunityRequest(activeCommunity._id, req.username)}
                                  className="bg-red-800/60 hover:bg-red-700 text-red-300 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition"
                                >✕ Reject</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search inside community */}
                    <div className="relative mb-4">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search posts in this community…"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition placeholder:text-zinc-600"
                        value={communityDetailSearchQuery}
                        onChange={e => setCommunityDetailSearchQuery(e.target.value)}
                      />
                      {communityDetailSearchQuery && (
                        <button onClick={() => setCommunityDetailSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition text-xs">✕</button>
                      )}
                    </div>

                    {/* Post composer */}
                    {activeCommunity.members?.find((m: any) => m.username === username) && (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-5">
                        <textarea placeholder="Share something with the community…" value={communityPostInput} onChange={e => setCommunityPostInput(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600 resize-none min-h-[80px] no-scrollbar" />
                        {communityMedia.length > 0 && (
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {communityMedia.map((m, i) => (
                              <div key={i} className="relative">
                                {m.fileType.startsWith('image') ? <img src={m.url} className="w-16 h-16 object-cover rounded-lg" /> :
                                 m.fileType.startsWith('video') ? <video src={m.url} className="w-16 h-16 object-cover rounded-lg" /> :
                                 <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 text-center p-1">📎 {m.fileName?.slice(0,8)}</div>}
                                <button onClick={() => setCommunityMedia(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <div className="flex gap-2">
                            <button onClick={() => communityFileRef.current?.click()} className="text-zinc-500 hover:text-zinc-300 transition text-xs flex items-center gap-1">
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Media
                            </button>
                          </div>
                          <input type="file" hidden ref={communityFileRef} accept="image/*,video/*,application/*,.pdf,.zip,.txt" multiple onChange={handleCommunityFileUpload} />
                          <button onClick={handleCommunityPost} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition">Post</button>
                        </div>
                      </div>
                    )}

                    {/* Community posts */}
                    <div className="space-y-4">
                      {filteredCommunityPosts.length === 0 && (
                        <div className="py-12 text-center text-zinc-600 text-sm">
                          {communityDetailSearchQuery ? `No posts matching "${communityDetailSearchQuery}"` : 'No posts yet. Be the first to post!'}
                        </div>
                      )}
                      {filteredCommunityPosts.slice().reverse().map((post: any) => (
                        <div key={post._id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-xs font-black">{post.username.charAt(0).toUpperCase()}</div>
                            <div className="flex-1">
                              <p className="text-sm font-bold">@{post.username}</p>
                              <p className="text-[10px] text-zinc-500">{relativeTime(post.createdAt)}</p>
                            </div>
                            {(post.username === username || activeCommunity.admin === username) && (
                              <button onClick={() => deleteCommunityPost(post._id)} className="text-red-500 text-[11px] font-bold hover:text-red-400 transition">Delete</button>
                            )}
                          </div>
                          {post.content && <p className="text-sm text-zinc-200 mb-3">{post.content}</p>}
                          {post.media && post.media.length > 0 && (
                            <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: post.media.length === 1 ? '1fr' : 'repeat(2, 1fr)' }}>
                              {post.media.map((m: any, i: number) => renderMediaItem(m, i))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/50">
                            <button onClick={() => handleCommunityLike(post._id)}
                              className={`flex items-center gap-1.5 text-xs font-bold transition ${post.likes?.includes(username) ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                              <svg width="14" height="14" fill={post.likes?.includes(username) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                              {post.likes?.length || 0}
                            </button>
                            <button onClick={() => { setCommunityCommentModal(post); setCommunityCommentInput(""); }}
                              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition">
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {post.comments?.length || 0} Comments
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DEVELOPERS PLATFORM SECTION */}
            {view === "developers" && (
              <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-4 sm:p-6" style={{ minHeight: 'calc(100vh - 120px)' }}>
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-black text-blue-400">Developers Platform</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Build and collaborate in real-time</p>
                  </div>
                  <button onClick={() => setIsCreateCollabOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition">+ New Project</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="p-5 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center mb-3">
                      <svg width="16" height="16" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </div>
                    <h3 className="font-bold mb-1.5 text-sm">API Documentation</h3>
                    <p className="text-xs text-zinc-500 mb-3">Build bots and integrations using the Whisper.io open API.</p>
                    <button className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition">View Docs</button>
                  </div>
                  <div className="p-5 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">
                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center mb-3">
                      <svg width="16" height="16" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <h3 className="font-bold mb-1.5 text-sm">Community Plugins</h3>
                    <p className="text-xs text-zinc-500 mb-3">Explore tools and enhancements from the community.</p>
                    <button className="bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition">Explore Store</button>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Collab Rooms</p>
                  {collabs.length === 0 && <div className="py-12 text-center text-zinc-600 text-sm">No projects yet. Start one!</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {collabs.map(c => {
                      const isMember = c.members?.find((m: any) => m.username === username);
                      const memberCount = c.members?.length || 0;
                      return (
                        <div key={c._id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-sm">{c.title}</h3>
                            {c.password && <span className="text-[10px] text-yellow-400 font-bold">🔒 Private</span>}
                          </div>
                          {c.description && <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{c.description}</p>}
                          {c.techStack && <p className="text-[10px] text-blue-400 font-bold mb-3">⚙️ {c.techStack}</p>}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {c.members?.slice(0, 4).map((m: any, i: number) => (
                              <span key={i} className="text-[9px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full text-zinc-400">{m.username === c.admin ? '👑' : ''}@{m.displayName || m.username}</span>
                            ))}
                            {memberCount > 4 && <span className="text-[9px] bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full text-zinc-500">+{memberCount - 4}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => handleOpenEditor(c)} className="bg-white text-black text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-zinc-200 transition flex items-center gap-1">⌨️ Open</button>
                            {!isMember && <button onClick={() => joinCollab(c)} className="text-blue-400 text-[10px] font-bold hover:text-blue-300 transition">Join</button>}
                            {c.admin === username && <button onClick={() => deleteCollab(c._id)} className="text-red-500 text-[10px] font-bold hover:text-red-400 transition ml-auto">Delete</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* EDITOR + WHITEBOARD VIEW */}
            {view === "editor" && activeCollab && (
              <div className="flex flex-col border border-zinc-800 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 100px)', background: '#1e1e1e' }}>
                <div style={{ background: '#323233', borderBottom: '1px solid #252526' }} className="flex items-center justify-between px-4 py-0 min-h-[35px] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block"></span>
                    </div>
                    <button onClick={() => setView("developers")} style={{ color: '#cccccc', fontSize: 11 }} className="hover:text-white transition px-1">← Exit</button>
                  </div>
                  <div className="flex items-center" style={{ gap: 0 }}>
                    <button onClick={() => setDevTab('code')} style={{ background: devTab === 'code' ? '#1e1e1e' : 'transparent', color: devTab === 'code' ? '#ccc' : '#888', borderTop: devTab === 'code' ? '1px solid #60a5fa' : '1px solid transparent', borderBottom: devTab === 'code' ? 'none' : '1px solid #252526', fontSize: 12, padding: '7px 20px', minWidth: 120, letterSpacing: 0.2 }} className="transition flex items-center gap-2">
                      <span style={{ color: '#e9c46a' }}>⬡</span> {activeCollab.title || 'main.js'}
                    </button>
                    <button onClick={() => setDevTab('whiteboard')} style={{ background: devTab === 'whiteboard' ? '#1e1e1e' : 'transparent', color: devTab === 'whiteboard' ? '#ccc' : '#888', borderTop: devTab === 'whiteboard' ? '1px solid #60a5fa' : '1px solid transparent', borderBottom: devTab === 'whiteboard' ? 'none' : '1px solid #252526', fontSize: 12, padding: '7px 20px', minWidth: 130 }} className="transition flex items-center gap-2">
                      <span>🎨</span> Whiteboard
                    </button>
                  </div>
                  <div className="flex items-center gap-3" style={{ fontSize: 11 }}>
                    <span style={{ color: '#4ec9b0' }}>⬤</span>
                    <span style={{ color: '#888' }}>LIVE</span>
                    <span style={{ color: '#555' }}>|</span>
                    <span style={{ color: '#888' }} className="hidden sm:inline">{activeCollab.techStack || 'JavaScript'}</span>
                  </div>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  <div style={{ background: '#333333', width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 8, borderRight: '1px solid #252526', flexShrink: 0 }}>
                    {[{ icon: '📄', label: 'Explorer', active: devTab === 'code' }, { icon: '🔍', label: 'Search', active: false }, { icon: '🌿', label: 'Source Control', active: false }, { icon: '🐛', label: 'Debug', active: false }, { icon: '🧩', label: 'Extensions', active: false }].map(item => (
                      <button key={item.label} title={item.label} style={{ width: 40, height: 40, background: item.active ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: item.active ? '2px solid #60a5fa' : '2px solid transparent', borderRadius: 4, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: item.active ? 1 : 0.5, cursor: 'pointer', transition: 'all 0.15s' }}>{item.icon}</button>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {devTab === 'code' && (
                      <Editor height="100%" defaultLanguage="javascript" theme="vs-dark" value={editorCode} onChange={handleCodeChange} options={VS_CODE_OPTIONS}
                        onMount={(editor, monaco) => {
                          const RAINBOW = ['#ff6b6b','#ff9f43','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd','#00d2d3','#1dd1a1','#ff6348','#eccc68','#7bed9f','#70a1ff','#a29bfe','#fd79a8','#fdcb6e','#e17055','#74b9ff','#81ecec','#fab1a0'];
                          let decorationIds: string[] = [];
                          const applyRainbow = () => {
                            const model = editor.getModel(); if (!model) return;
                            const text = model.getValue(); const newDecorations: any[] = []; let colorIdx = 0;
                            for (let i = 0; i < text.length; i++) {
                              if (text[i] === '\n' || text[i] === '\r') { colorIdx = 0; continue; }
                              if (text[i] === ' ' || text[i] === '\t') { colorIdx++; continue; }
                              const pos = model.getPositionAt(i); const posEnd = model.getPositionAt(i + 1);
                              const className = `rainbow-char-${colorIdx % RAINBOW.length}`;
                              if (!document.getElementById(`rc-style-${colorIdx % RAINBOW.length}`)) {
                                const style = document.createElement('style'); style.id = `rc-style-${colorIdx % RAINBOW.length}`;
                                style.textContent = `.${className} { color: ${RAINBOW[colorIdx % RAINBOW.length]} !important; }`; document.head.appendChild(style);
                              }
                              newDecorations.push({ range: new monaco.Range(pos.lineNumber, pos.column, posEnd.lineNumber, posEnd.column), options: { inlineClassName: className } });
                              colorIdx++;
                            }
                            decorationIds = editor.deltaDecorations(decorationIds, newDecorations);
                          };
                          RAINBOW.forEach((color, idx) => { if (!document.getElementById(`rc-style-${idx}`)) { const style = document.createElement('style'); style.id = `rc-style-${idx}`; style.textContent = `.rainbow-char-${idx} { color: ${color} !important; }`; document.head.appendChild(style); } });
                          editor.onDidChangeModelContent(() => { applyRainbow(); }); applyRainbow();
                        }}
                      />
                    )}
                    {devTab === 'whiteboard' && (
                      <div className="flex flex-col h-full" style={{ background: '#1e1e1e' }}>
                        <div style={{ background: '#252526', borderBottom: '1px solid #3e3e42', padding: '8px 16px' }} className="flex items-center gap-3 flex-wrap flex-shrink-0">
                          <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-700">
                            {[{ id: 'pen', icon: '✏️', label: 'Pen' }, { id: 'eraser', icon: '🧹', label: 'Eraser' }, { id: 'line', icon: '╱', label: 'Line' }, { id: 'arrow', icon: '➜', label: 'Arrow' }, { id: 'rect', icon: '▭', label: 'Rect' }, { id: 'circle', icon: '○', label: 'Circle' }, { id: 'text', icon: 'T', label: 'Text' }].map(t => (
                              <button key={t.id} title={t.label} onClick={() => setWbTool(t.id as any)} style={{ padding: '5px 10px', borderRadius: 6, background: wbTool === t.id ? '#60a5fa22' : 'transparent', border: wbTool === t.id ? '1px solid #60a5fa' : '1px solid transparent', color: wbTool === t.id ? '#60a5fa' : '#888', fontSize: t.id === 'text' ? 13 : 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', minWidth: 36 }}>{t.icon}</button>
                            ))}
                          </div>
                          <div style={{ width: 1, height: 28, background: '#3e3e42' }} />
                          <div className="flex gap-1.5 items-center">
                            {WB_COLORS.map(c => (
                              <button key={c} onClick={() => setWbColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: wbColor === c ? '2px solid white' : '2px solid #3e3e42', cursor: 'pointer', transition: 'transform 0.1s', transform: wbColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                            ))}
                            <input type="color" value={wbColor} onChange={e => setWbColor(e.target.value)} style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid #3e3e42', cursor: 'pointer', background: 'transparent', padding: 1 }} />
                          </div>
                          <div style={{ width: 1, height: 28, background: '#3e3e42' }} />
                          <div className="flex items-center gap-2">
                            <span style={{ color: '#888', fontSize: 11 }}>SIZE</span>
                            <input type="range" min={1} max={20} value={wbSize} onChange={e => setWbSize(Number(e.target.value))} style={{ width: 80, accentColor: '#60a5fa' }} />
                            <span style={{ color: '#ccc', fontSize: 11, minWidth: 16 }}>{wbSize}</span>
                          </div>
                          <div style={{ width: 1, height: 28, background: '#3e3e42' }} />
                          <button onClick={handleWbClear} style={{ padding: '4px 14px', borderRadius: 6, background: '#ff5f5720', border: '1px solid #ff5f5780', color: '#ff5f57', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗑 CLEAR</button>
                          <div className="ml-auto flex items-center gap-2"><span style={{ color: '#4ec9b0', fontSize: 11 }}>⬤ LIVE WHITEBOARD</span></div>
                        </div>
                        <div className="relative flex-1 overflow-hidden" style={{ background: '#1a1a2e', cursor: wbTool === 'eraser' ? 'cell' : wbTool === 'text' ? 'text' : 'crosshair' }}>
                          <canvas ref={whiteboardCanvasRef} width={1400} height={900} style={{ width: '100%', height: '100%', display: 'block' }} onMouseDown={handleWbMouseDown} onMouseMove={handleWbMouseMove} onMouseUp={handleWbMouseUp} onMouseLeave={() => { isDrawingRef.current = false; }} />
                          {wbTextPos && (
                            <div style={{ position: 'absolute', left: Math.max(4, Math.min(wbTextPos.x, (whiteboardCanvasRef.current?.offsetWidth || 800) - 340)), top: Math.max(4, wbTextPos.y - 10), zIndex: 20 }}>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center', background: 'rgba(10,10,14,0.92)', border: '1px solid #3e3e42', borderRadius: 8, padding: '4px 8px' }}>
                                {['#ffffff','#60a5fa','#f472b6','#34d399','#fbbf24','#f87171','#a78bfa','#fb923c','#22d3ee','#4ade80'].map(c => (
                                  <button key={c} onMouseDown={ev=>{ev.preventDefault();setWbTextActiveColor(c);}} style={{ width:16,height:16,borderRadius:'50%',background:c,border:wbTextActiveColor===c?'2px solid white':'2px solid transparent',cursor:'pointer',transform:wbTextActiveColor===c?'scale(1.3)':'scale(1)',transition:'transform 0.1s',flexShrink:0 }} />
                                ))}
                                <input type="color" value={wbTextActiveColor} onChange={e=>setWbTextActiveColor(e.target.value)} style={{width:16,height:16,borderRadius:3,border:'none',cursor:'pointer',background:'transparent',padding:0}} />
                                {wbTextSegments.length > 0 && (
                                  <span style={{marginLeft:4,display:'flex',gap:3}}>
                                    {wbTextSegments.map((seg,i)=>(<span key={i} onMouseDown={ev=>{ev.preventDefault();setWbTextSegments(p=>p.filter((_,idx)=>idx!==i));}} style={{color:seg.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'monospace',background:seg.color+'22',borderRadius:3,padding:'0 4px'}}>{seg.text}×</span>))}
                                  </span>
                                )}
                                <button onMouseDown={ev=>{ev.preventDefault();setWbTextPos(null);setWbTextCanvasPos(null);setWbTextSegments([]);setWbTextInput('');}} style={{marginLeft:4,color:'#ff5f57',fontSize:12,fontWeight:900,cursor:'pointer',background:'none',border:'none',lineHeight:1}}>✕</button>
                              </div>
                              <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                <input autoFocus type="text" value={wbTextInput} onChange={e=>setWbTextInput(e.target.value)}
                                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleWbStampText();}if(e.key===' '&&wbTextInput.trim()){e.preventDefault();handleWbAddSegment();}if(e.key==='Escape'){setWbTextPos(null);setWbTextCanvasPos(null);setWbTextSegments([]);setWbTextInput('');}}}
                                  placeholder="Type here…" style={{background:'rgba(10,10,14,0.85)',border:`2px solid ${wbTextActiveColor}`,borderRadius:6,color:wbTextActiveColor,fontFamily:"'Cascadia Code','Fira Code',monospace",fontSize:20,fontWeight:700,padding:'2px 10px',outline:'none',minWidth:160,caretColor:wbTextActiveColor,boxShadow:`0 0 12px ${wbTextActiveColor}44`}} />
                                <button onMouseDown={ev=>{ev.preventDefault();handleWbAddSegment();}} disabled={!wbTextInput.trim()} style={{background:wbTextActiveColor,color:'#000',border:'none',borderRadius:5,padding:'4px 8px',fontSize:11,fontWeight:900,cursor:'pointer',opacity:wbTextInput.trim()?1:0.4}}>+</button>
                                <button onMouseDown={ev=>{ev.preventDefault();handleWbStampText();}} disabled={!wbTextInput.trim()&&wbTextSegments.length===0} style={{background:'#007acc',color:'#fff',border:'none',borderRadius:5,padding:'4px 8px',fontSize:11,fontWeight:900,cursor:'pointer',opacity:(wbTextInput.trim()||wbTextSegments.length>0)?1:0.4}}>↩</button>
                              </div>
                              <p style={{color:'#555',fontSize:9,marginTop:3,fontFamily:'monospace'}}>Space/+ = add colored word · Enter/↩ = stamp · Esc = cancel</p>
                            </div>
                          )}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, #ffffff08 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ background: '#007acc', padding: '2px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, minHeight: 24, flexShrink: 0 }}>
                  <div className="flex items-center gap-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <span>⎇ main</span>
                    <span>● {activeCollab.members?.length || 1} online</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    <span>{devTab === 'code' ? 'JavaScript' : 'Whiteboard'}</span>
                    <span className="hidden sm:inline">UTF-8</span><span className="hidden sm:inline">LF</span><span className="hidden sm:inline">Spaces: 2</span>
                  </div>
                </div>
              </div>
            )}

            {/* FEED SECTION */}
            {(view !== "gossip" && view !== "pm" && view !== "developers" && view !== "editor" && view !== "communities") && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-black">
                      {view === 'profile' ? `@${selectedProfileUser}'s Posts` : view === 'explore' ? (selectedCategory === 'All' ? 'Global Feed' : `# ${selectedCategory}`) : view === 'popular' ? '📈 Trending' : view === 'workspace' ? '💼 My Secrets' : 'Recent Whispers'}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {thoughts.filter(t => moodFilter === "All" || t.mood === moodFilter).length} posts
                    </p>
                  </div>
                  <button onClick={() => { setIsProfileOpen(true); setEditingId(null); setInput(""); setImages([]); setVideos([]); setPostFiles([]); }}
                    className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold transition active:scale-95">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Post
                  </button>
                </div>

                {thoughts
                  .filter(t => (t.content || "").toLowerCase().includes(searchQuery.toLowerCase()))
                  .filter(t => moodFilter === "All" || t.mood === moodFilter)
                  .map((t: any, idx: number) => (
                    <div key={t._id} className="feed-item post-card bg-[#111112] border border-zinc-900 rounded-2xl mb-3 overflow-hidden" style={{ animationDelay: `${idx * 0.04}s` }}>
                      <div className="flex">
                        {/* Vote column */}
                        <div className="flex flex-col items-center gap-1 px-2 sm:px-3 py-4 bg-[#0d0d0e] min-w-[44px] sm:min-w-[52px]">
                          <button onClick={() => handleInteraction(t._id, 'like')}
                            className={`vote-btn w-7 h-7 rounded-lg flex items-center justify-center transition ${t.likes?.includes(username) ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-blue-400'}`}>
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l8 8H4z"/></svg>
                          </button>
                          <span className={`text-xs font-black ${t.likes?.includes(username) ? 'text-blue-400' : t.dislikes?.includes(username) ? 'text-red-400' : 'text-zinc-400'}`}>
                            {(t.likes?.length || 0) - (t.dislikes?.length || 0)}
                          </span>
                          <button onClick={() => handleInteraction(t._id, 'dislike')}
                            className={`vote-btn w-7 h-7 rounded-lg flex items-center justify-center transition ${t.dislikes?.includes(username) ? 'bg-red-600 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400'}`}>
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l-8-8h16z"/></svg>
                          </button>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 p-3 sm:p-4 min-w-0">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <button onClick={() => openUserProfile(t.username)} className="flex items-center gap-1.5 hover:text-blue-400 transition min-w-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">{(t.username || 'A').charAt(0).toUpperCase()}</div>
                                <span className="text-[12px] font-bold truncate">@{t.username}</span>
                              </button>
                              <span className="text-zinc-700 hidden sm:inline">·</span>
                              <span className="text-[11px] text-zinc-500 hidden sm:inline">{t.createdAt ? relativeTime(t.createdAt) : ''}</span>
                              <span className="text-[11px]">{t.mood}</span>
                              {t.category && t.category !== 'All' && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold hidden sm:inline">#{t.category}</span>
                              )}
                            </div>
                            <div className="relative flex-shrink-0 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); setOpenPostMenu(openPostMenu === t._id ? null : t._id); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                              </button>
                              {openPostMenu === t._id && (
                                <div className="absolute right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[150px]" style={{ zIndex: 999 }} onClick={e => e.stopPropagation()}>
                                  <button onClick={() => { handleShare(t.content); setOpenPostMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-zinc-300 hover:bg-zinc-900 transition">
                                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                    Share
                                  </button>
                                  {view === "workspace" && (
                                    <>
                                      <button onClick={() => { setEditingId(t._id); setInput(t.content); setSelectedMood(t.mood); setImages(t.images || []); setVideos(t.videos || []); setPostFiles(t.files || []); setIsProfileOpen(true); setOpenPostMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-blue-400 hover:bg-zinc-900 transition">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        Edit Post
                                      </button>
                                      <button onClick={() => { deletePost(t._id); setOpenPostMenu(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-red-500 hover:bg-zinc-900 transition">
                                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {t.content && <p className="text-zinc-100 text-[14px] sm:text-[15px] leading-relaxed mb-3 italic">"{t.content}"</p>}

                          {/* Images grid */}
                          {t.images && t.images.length > 0 && (
                            <div className={`grid gap-1.5 mb-3 rounded-xl overflow-hidden ${t.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {t.images.slice(0, 4).map((img: string, idx: number) => (
                                <div key={idx} className={`relative ${t.images.length === 3 && idx === 0 ? 'row-span-2' : ''}`}>
                                  <img src={img} onClick={() => setZoomedImage(img)} className="w-full object-cover cursor-zoom-in hover:brightness-110 transition" style={{ height: t.images.length === 1 ? '240px' : '140px' }} />
                                  {idx === 3 && t.images.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer" onClick={() => setZoomedImage(t.images[3])}>
                                      <span className="text-white text-xl font-black">+{t.images.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Videos */}
                          {t.videos && t.videos.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {t.videos.map((vid: string, idx: number) => (
                                <video key={idx} src={vid} controls className="w-full rounded-xl max-h-64 bg-black" />
                              ))}
                            </div>
                          )}

                          {/* Files */}
                          {t.files && t.files.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {t.files.map((f: any, idx: number) => (
                                <a key={idx} href={f.url} download={f.fileName} className="flex items-center gap-2 text-xs font-bold text-blue-300 bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-800/40 hover:bg-blue-800/30 transition">
                                  📎 {f.fileName || 'Download File'}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Action bar */}
                          <div className="flex items-center gap-1 pt-1">
                            <button onClick={() => setCommentModalPost(t)} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition text-[11px] sm:text-[12px] font-semibold">
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {t.comments?.length || 0} <span className="hidden sm:inline">Comments</span>
                            </button>
                            <button onClick={() => handleShare(t.content)} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition text-[11px] sm:text-[12px] font-semibold ml-auto">
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                              <span className="hidden sm:inline">Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* No posts state — stable, no scroll bounce */}
                {thoughts.filter(t => moodFilter === "All" || t.mood === moodFilter).length === 0 && (
                  <div style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="text-5xl mb-4">👻</p>
                    <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">No {moodFilter !== 'All' ? moodFilter : ''} whispers here yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== ALL MODALS ===== */}

      {/* ZOOM IMAGE MODAL */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition">✕</button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* COMMENT MODAL */}
      {commentModalPost && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '90vh' }}>
            <div className="p-4 sm:p-5 border-b border-zinc-900 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-black text-white">Comments</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{commentModalPost.comments?.length || 0} replies</p>
              </div>
              <button onClick={() => { setCommentModalPost(null); setCommentInput(""); }} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="px-4 sm:px-5 py-3 border-b border-zinc-900/70 bg-zinc-900/30 flex-shrink-0">
              <p className="text-sm text-zinc-300 italic">"{commentModalPost.content}"</p>
              <p className="text-[10px] text-zinc-600 mt-1">@{commentModalPost.username}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
              {(!commentModalPost.comments || commentModalPost.comments.length === 0) && (
                <div className="text-center text-zinc-600 font-bold text-xs tracking-widest py-10 uppercase">No comments yet. Be first!</div>
              )}
              {(commentModalPost.comments || []).map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                    {(c.username || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-zinc-900 px-3.5 py-2.5 rounded-xl rounded-tl-sm border border-zinc-800">
                    <p className="text-[10px] font-bold text-blue-400 mb-1">@{c.username || 'Anonymous'}</p>
                    <p className="text-sm text-zinc-200">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 sm:p-4 border-t border-zinc-900 flex gap-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Write a reply…"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !isPostingComment && commentInput.trim()) handlePostComment(); }}
                disabled={isPostingComment}
                autoFocus
              />
              <button
                onClick={handlePostComment}
                disabled={isPostingComment || !commentInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPostingComment ? '…' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITY COMMENT MODAL */}
      {communityCommentModal && activeCommunity && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '90vh' }}>
            <div className="p-4 sm:p-5 border-b border-zinc-900 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-black text-white">Comments</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{communityCommentModal.comments?.length || 0} replies</p>
              </div>
              <button onClick={() => { setCommunityCommentModal(null); setCommunityCommentInput(""); }} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-zinc-400 hover:text-white">✕</button>
            </div>
            {communityCommentModal.content && (
              <div className="px-4 sm:px-5 py-3 border-b border-zinc-900/70 bg-zinc-900/30 flex-shrink-0">
                <p className="text-sm text-zinc-300">{communityCommentModal.content}</p>
                <p className="text-[10px] text-zinc-600 mt-1">@{communityCommentModal.username}</p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
              {(!communityCommentModal.comments || communityCommentModal.comments.length === 0) && (
                <div className="text-center text-zinc-600 font-bold text-xs tracking-widest py-10 uppercase">No comments yet.</div>
              )}
              {(communityCommentModal.comments || []).map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                    {(c.username || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-zinc-900 px-3.5 py-2.5 rounded-xl rounded-tl-sm border border-zinc-800">
                    <p className="text-[10px] font-bold text-blue-400 mb-1">@{c.username}</p>
                    <p className="text-sm text-zinc-200">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 sm:p-4 border-t border-zinc-900 flex gap-2 flex-shrink-0">
              <input type="text" placeholder="Write a reply…" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" value={communityCommentInput} onChange={e => setCommunityCommentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCommunityComment()} autoFocus />
              <button onClick={handleCommunityComment} disabled={!communityCommentInput.trim()} className="bg-blue-600 hover:bg-blue-500 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition disabled:opacity-50">Reply</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COMMUNITY MODAL */}
      {isCreateCommunityOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black mb-4">Create Community</h3>
            <input type="text" placeholder="Community Name…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newCommunityData.name} onChange={e => setNewCommunityData({...newCommunityData, name: e.target.value})} />
            <textarea placeholder="Description…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm h-20 transition resize-none" value={newCommunityData.description} onChange={e => setNewCommunityData({...newCommunityData, description: e.target.value})} />
            <select className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition appearance-none" value={newCommunityData.topic} onChange={e => setNewCommunityData({...newCommunityData, topic: e.target.value})}>
              {COMMUNITY_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="password" placeholder="Password (Optional — makes it private)…" className="w-full bg-zinc-900 p-3 rounded-xl mb-4 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newCommunityData.password} onChange={e => setNewCommunityData({...newCommunityData, password: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={handleCreateCommunity} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Create</button>
              <button onClick={() => setIsCreateCommunityOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITY JOIN PASSWORD MODAL */}
      {joinPasswordModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black mb-1">🔒 Join {joinPasswordModal.name}</h3>
            <p className="text-xs text-zinc-500 mb-4">This community is private. Enter the password to send a join request.</p>
            <input autoFocus type="password" placeholder="Enter password…" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-zinc-600 transition mb-4" value={joinPasswordInput} onChange={e => setJoinPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && doRequestJoinCommunity(joinPasswordModal._id, joinPasswordInput)} />
            <div className="flex gap-2">
              <button onClick={() => doRequestJoinCommunity(joinPasswordModal._id, joinPasswordInput)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Send Request</button>
              <button onClick={() => setJoinPasswordModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black mb-4">Create Gossip Room</h3>
            <input type="text" placeholder="Room Name…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newRoomData.name} onChange={e => setNewRoomData({...newRoomData, name: e.target.value})} />
            <input type="password" placeholder="Password (Optional)…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newRoomData.password} onChange={e => setNewRoomData({...newRoomData, password: e.target.value})} />
            <textarea placeholder="Description…" className="w-full bg-zinc-900 p-3 rounded-xl mb-4 border border-zinc-800 outline-none focus:border-zinc-600 text-sm h-20 transition" value={newRoomData.description} onChange={e => setNewRoomData({...newRoomData, description: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={async () => { await fetch('https://whisper-mi0t.onrender.com/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...newRoomData, admin: username}) }); setIsCreateRoomOpen(false); fetchRooms(); }} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Create</button>
              <button onClick={() => setIsCreateRoomOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* GOSSIP ROOM NICKNAME MODAL */}
      {nicknamePendingRoom && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black mb-1">Join #{nicknamePendingRoom.name}</h3>
            <p className="text-xs text-zinc-500 mb-5">How do you want to appear?</p>
            <div className="flex gap-2 mb-5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button onClick={() => setNicknameChoice("original")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${nicknameChoice === "original" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"}`}>👤 My Username</button>
              <button onClick={() => setNicknameChoice("new")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${nicknameChoice === "new" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"}`}>🎭 New Name</button>
            </div>
            {nicknameChoice === "original" && (
              <div className="text-center py-3 mb-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <p className="text-zinc-500 text-xs mb-1">You'll join as</p>
                <p className="text-xl font-black">@{username}</p>
              </div>
            )}
            {nicknameChoice === "new" && (
              <div className="mb-4 space-y-3">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Suggestions</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[...NICKNAME_SUGGESTIONS].sort(() => 0.5 - Math.random()).slice(0, 4).map(name => (
                      <button key={name} onClick={() => { setSelectedNickname(name); setCustomNickname(""); }} className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${selectedNickname === name && !customNickname ? "bg-blue-600 border-blue-400 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"}`}>{name}</button>
                    ))}
                  </div>
                </div>
                <input type="text" placeholder="Or type custom…" maxLength={20} className="w-full bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={customNickname} onChange={e => { setCustomNickname(e.target.value); setSelectedNickname(""); }} />
                <div className="text-center bg-zinc-900/50 rounded-xl border border-zinc-800 py-2">
                  <p className="text-zinc-500 text-xs">You'll join as</p>
                  <p className="text-lg font-black text-blue-400">@{customNickname.trim() || selectedNickname || username}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={confirmJoinRoom} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Join 🚀</button>
              <button onClick={() => setNicknamePendingRoom(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COLLAB MODAL */}
      {isCreateCollabOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black mb-4">New Collab Project</h3>
            <input type="text" placeholder="Project Title…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newCollabData.title} onChange={e => setNewCollabData({...newCollabData, title: e.target.value})} />
            <input type="text" placeholder="Tech Stack (e.g. React, Node)…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newCollabData.techStack} onChange={e => setNewCollabData({...newCollabData, techStack: e.target.value})} />
            <input type="password" placeholder="Password (Optional — makes it private)…" className="w-full bg-zinc-900 p-3 rounded-xl mb-3 border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={newCollabData.password} onChange={e => setNewCollabData({...newCollabData, password: e.target.value})} />
            <textarea placeholder="Description…" className="w-full bg-zinc-900 p-3 rounded-xl mb-4 border border-zinc-800 outline-none focus:border-zinc-600 text-sm h-20 transition" value={newCollabData.description} onChange={e => setNewCollabData({...newCollabData, description: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={handleCreateCollab} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Create & Code</button>
              <button onClick={() => setIsCreateCollabOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAB JOIN MODAL */}
      {collabJoinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-black mb-1">Join {collabJoinModal.title}</h3>
            <p className="text-xs text-zinc-500 mb-5">Set your display name & access</p>
            <div className="space-y-3 mb-5">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Display Name</p>
                <input type="text" placeholder={`Default: @${username}`} maxLength={20} className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={collabJoinNickname} onChange={e => setCollabJoinNickname(e.target.value)} />
              </div>
              {collabJoinModal.password && (
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">🔒 Password Required</p>
                  <input type="password" placeholder="Enter password…" className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none focus:border-zinc-600 text-sm transition" value={collabJoinPassword} onChange={e => setCollabJoinPassword(e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCollabJoinSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Join Project</button>
              <button onClick={() => setCollabJoinModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-sm uppercase transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR PASSWORD MODAL */}
      {editorPasswordModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="w-full max-w-sm shadow-2xl" style={{ background: '#1e1e1e', border: '1px solid #3e3e42', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: '#323233', borderBottom: '1px solid #252526', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] inline-block"></span><span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] inline-block"></span><span className="w-2.5 h-2.5 rounded-full bg-[#28c840] inline-block"></span></div>
              <span style={{ color: '#ccc', fontSize: 12, marginLeft: 8 }}>Open Editor — {editorPasswordModal.title}</span>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 40, height: 40, background: '#007acc20', border: '1px solid #007acc60', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔐</div>
                <div>
                  <p style={{ color: '#ccc', fontWeight: 700, fontSize: 14 }}>Editor Access</p>
                  <p style={{ color: '#888', fontSize: 11 }}>Enter password to open</p>
                </div>
              </div>
              <input autoFocus type="password" placeholder="Password…" value={editorPasswordInput} onChange={e => { setEditorPasswordInput(e.target.value); setEditorPasswordError(''); }} onKeyDown={e => { if (e.key === 'Enter') handleEditorPasswordSubmit(); if (e.key === 'Escape') setEditorPasswordModal(null); }} style={{ width: '100%', background: '#3c3c3c', border: editorPasswordError ? '1px solid #f48771' : '1px solid #3e3e42', borderRadius: 6, color: '#ccc', fontFamily: "'Cascadia Code', monospace", fontSize: 13, padding: '10px 14px', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              {editorPasswordError && <p style={{ color: '#f48771', fontSize: 11, marginBottom: 12 }}>⚠️ {editorPasswordError}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleEditorPasswordSubmit} style={{ flex: 1, background: '#007acc', color: 'white', border: 'none', borderRadius: 6, padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => (e.currentTarget.style.background = '#005f9e')} onMouseLeave={e => (e.currentTarget.style.background = '#007acc')}>Open</button>
                <button onClick={() => setEditorPasswordModal(null)} style={{ flex: 1, background: '#3c3c3c', color: '#ccc', border: '1px solid #3e3e42', borderRadius: 6, padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }} onMouseEnter={e => (e.currentTarget.style.background = '#4a4a4a')} onMouseLeave={e => (e.currentTarget.style.background = '#3c3c3c')}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ maxHeight: '92vh' }}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-900 flex-shrink-0">
              <div>
                <h3 className="font-black text-white">Settings</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Manage your account</p>
              </div>
              <button onClick={() => { setIsSettingsOpen(false); setSettingsMsg(""); }} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="flex border-b border-zinc-900 flex-shrink-0">
              {[{ id: 'profile', label: 'Profile' }, { id: 'account', label: 'Account' }, { id: 'delete', label: 'Delete Acct' }].map(tab => (
                <button key={tab.id} onClick={() => { setSettingsTab(tab.id as any); setSettingsMsg(""); }}
                  className={`flex-1 py-3 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition border-b-2 ${settingsTab === tab.id ? (tab.id === 'delete' ? 'border-red-500 text-red-400' : 'border-blue-500 text-white') : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
              {settingsTab === 'profile' && (
                <>
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-2xl font-black flex-shrink-0">{username.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="font-bold text-sm">@{username}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Avatar auto-generated from username</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Display Name</label>
                    <input type="text" placeholder={username} value={settingsDisplayName} onChange={e => setSettingsDisplayName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Bio</label>
                    <textarea placeholder="Write something about yourself…" value={settingsBio} onChange={e => setSettingsBio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition h-20 resize-none no-scrollbar" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Default Mood</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {MOODS.map(m => (
                        <button key={m.label} onClick={() => setSelectedMood(m.emoji)} className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-0.5 ${selectedMood === m.emoji ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                          <span className="text-lg">{m.emoji}</span>
                          <span className="text-[8px] font-bold text-zinc-400">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {settingsMsg && <p className={`text-xs font-bold text-center ${settingsMsgType === 'error' ? 'text-red-400' : 'text-green-400'}`}>{settingsMsg}</p>}
                  <button onClick={() => { setSettingsMsgType('success'); setSettingsMsg("Profile updated!"); setTimeout(() => setSettingsMsg(""), 2000); }} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition">Save Profile</button>
                </>
              )}
              {settingsTab === 'account' && (
                <>
                  <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Username</p>
                    <p className="font-bold">@{username}</p>
                  </div>
                  <div className="border-t border-zinc-900 pt-4">
                    <p className="text-sm font-bold mb-3">Change Password</p>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Current Password</label>
                        <input type="password" placeholder="••••••••" value={settingsCurrentPassword} onChange={e => { setSettingsCurrentPassword(e.target.value); setSettingsMsg(""); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">New Password</label>
                        <input type="password" placeholder="••••••••" value={settingsNewPassword} onChange={e => { setSettingsNewPassword(e.target.value); setSettingsMsg(""); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                        <input type="password" placeholder="••••••••" value={settingsConfirmPassword} onChange={e => { setSettingsConfirmPassword(e.target.value); setSettingsMsg(""); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition" />
                      </div>
                    </div>
                    {settingsMsg && <p className={`text-xs font-bold text-center mt-2 ${settingsMsgType === 'error' ? 'text-red-400' : 'text-green-400'}`}>{settingsMsg}</p>}
                    <button onClick={handleChangePassword} className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-sm uppercase transition mt-3 active:scale-95">Update Password</button>
                  </div>
                  <div className="border-t border-zinc-900 pt-4">
                    <button onClick={handleLogout} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-2.5 rounded-xl font-bold text-sm uppercase transition text-zinc-300">Sign Out</button>
                  </div>
                </>
              )}
              {settingsTab === 'delete' && (
                <>
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center text-3xl">⚠️</div>
                    <div>
                      <h3 className="text-lg font-black text-red-400">Delete Account</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs">This is permanent and cannot be undone. All your posts, messages, rooms, and data will be wiped forever.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/10 space-y-3">
                    {['All your secret posts and comments will be deleted', 'All private messages will be erased', 'Your username will be permanently released', 'This action cannot be reversed'].map((item, i) => (
                      <div key={i} className="flex items-start gap-3"><span className="text-red-500 mt-0.5 flex-shrink-0">✕</span><p className="text-xs text-zinc-400">{item}</p></div>
                    ))}
                  </div>
                  <button onClick={deleteAccount} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition text-white active:scale-95">🗑 Delete My Account Permanently</button>
                  <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-2.5 rounded-xl font-bold text-sm uppercase transition text-zinc-400">Cancel — Keep My Account</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POST SECRET DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-900 z-[210] transform transition-transform duration-500 flex flex-col shadow-2xl ${isProfileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-zinc-900 flex-shrink-0">
          <div>
            <h3 className="text-lg font-black">{editingId ? "Edit Secret" : "New Secret"}</h3>
            <p className="text-xs text-zinc-500">Posted anonymously</p>
          </div>
          <button onClick={() => setIsProfileOpen(false)} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition text-zinc-400 hover:text-white">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 no-scrollbar p-4 sm:p-5 space-y-5">
          {/* Category */}
          <div>
            <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Topic Channel</label>
            <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-600 transition appearance-none" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Mood */}
          <div>
            <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Your Mood</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MOODS.map(m => (
                <button key={m.label} onClick={() => setSelectedMood(m.emoji)} className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1 ${selectedMood === m.emoji ? 'bg-blue-600 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Your Secret</label>
            <textarea className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-zinc-600 transition min-h-[120px] italic placeholder:text-zinc-600 no-scrollbar resize-none" placeholder="Unleash your thoughts…" value={input} onChange={e => setInput(e.target.value)} />
          </div>

          {/* Images */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Photos ({images.length}/5)</label>
              <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 text-[11px] font-bold hover:text-blue-300 transition flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
              </button>
            </div>
            <input type="file" hidden accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} />
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={img} className="w-16 h-16 object-cover rounded-xl border border-zinc-800" />
                    <button onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center border-2 border-zinc-950 hover:bg-red-500 transition">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Videos ({videos.length}/2)</label>
              <button onClick={() => videoInputRef.current?.click()} className="text-purple-400 text-[11px] font-bold hover:text-purple-300 transition flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
              </button>
            </div>
            <input type="file" hidden accept="video/*" multiple ref={videoInputRef} onChange={handleVideoUpload} />
            {videos.length > 0 && (
              <div className="space-y-2">
                {videos.map((vid, idx) => (
                  <div key={idx} className="relative">
                    <video src={vid} className="w-full rounded-xl max-h-36 bg-black" controls />
                    <button onClick={() => removeVideo(idx)} className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center border-2 border-zinc-950">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Files ({postFiles.length})</label>
              <button onClick={() => filePostInputRef.current?.click()} className="text-green-400 text-[11px] font-bold hover:text-green-300 transition flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add
              </button>
            </div>
            <input type="file" hidden accept=".pdf,.zip,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple ref={filePostInputRef} onChange={handleFilePostUpload} />
            {postFiles.length > 0 && (
              <div className="space-y-1.5">
                {postFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-sm">📎</span>
                    <span className="text-xs text-zinc-300 flex-1 truncate">{f.fileName}</span>
                    <button onClick={() => removePostFile(idx)} className="text-red-500 text-[10px] font-bold hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handlePost} className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition">
            {editingId ? "Save Changes" : "Post Anonymously"}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-zinc-900 z-[180] flex items-center justify-around px-2 py-2 md:hidden">
        {[...navItems, ...navItems2].map(item => (
          <button key={item.id} onClick={() => { setView(item.id); if (item.id === "home") setMoodFilter("All"); if (item.id === "communities") { setCommunityView('list'); fetchCommunities(); } }}
            className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition ${view === item.id ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
            <span className="w-5 h-5">{item.icon}</span>
            <span className="text-[7px] font-bold uppercase tracking-wide">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
