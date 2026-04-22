'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Settings, Camera, ChevronDown, Zap, BarChart2, Activity, Menu, X, LogIn, Moon, Sun, Globe, Brain, Mic, MicOff, Share2, Layers } from 'lucide-react';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { supabaseDb, getGoogleAuthUrl, getUser } from '@/lib/supabase-client';

interface Message { id: string; role: 'user' | 'assistant'; content: string; image?: string; images?: string[]; isTyping?: boolean; }
interface ChatSession { id: string; title: string; messages: Message[] }
interface UserSettings { theme: 'dark'|'light'; language: string; personalIntelligence: string; }
interface User { id: string; email: string; name: string; settings: UserSettings }

function cleanAIResponse(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1')
    .replace(/  +/g, ' ').replace(/\n\n\n+/g, '\n\n').trim();
}

const Typewriter = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);
  return <>{displayedText}</>;
};

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    ::-webkit-scrollbar { width: 6px; } 
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.2); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(124, 58, 237, 0.5); }
    
    .smooth-transition { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .smooth-hover:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.15) !important; }
    .smooth-input { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .smooth-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important; }
    
    .msg-bubble { animation: springUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    @keyframes springUp { 
      from { opacity: 0; transform: translateY(15px) scale(0.97); } 
      to { opacity: 1; transform: translateY(0) scale(1); } 
    }
    
    .typing-dot { animation: blink 1.2s infinite; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
    
    .glass-panel { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  `}</style>
);

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login'|'register'|null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  const [selectedModel, setSelectedModel] = useState<ModelKey>('zenix-think');
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // multi-TF: max 3
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Voice Command state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Share Signal Card state
  const [shareTarget, setShareTarget] = useState<Message | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ theme: 'dark', language: 'Bahasa Indonesia', personalIntelligence: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setModelDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load User from LocalStorage on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        getUser(accessToken).then(supaUser => {
          if (supaUser) {
            const u: User = {
              id: supaUser.id,
              email: supaUser.email,
              name: supaUser.user_metadata?.full_name || supaUser.email.split('@')[0],
              settings: { theme: 'dark', language: 'Bahasa Indonesia', personalIntelligence: '' }
            };
            localStorage.setItem('zenix_user', JSON.stringify(u));
            localStorage.setItem('zenix_token', accessToken);
            setUser(u);
            setAuthMode(null);
            fetchChats(u.id);
            window.location.hash = '';
          } else {
            setAuthMode('login');
          }
          setIsAppLoading(false);
        });
        return;
      }
    }

    const stored = localStorage.getItem('zenix_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setSettings(u.settings);
      setAuthMode(null);
      fetchChats(u.id);
    } else {
      setAuthMode('login');
    }
    setIsAppLoading(false);
  }, []);

  // Apply Theme
  useEffect(() => {
    if (settings.theme === 'light') {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    } else {
      document.body.style.backgroundColor = '#0d0d0d';
      document.body.style.color = '#ffffff';
    }
  }, [settings.theme]);

  const fetchChats = async (userId: string) => {
    try {
      const data = await supabaseDb.getChats(userId);
      setChats(data || []);
    } catch (e) {}
  };

  const saveChat = async (chatToSave: ChatSession) => {
    if (!user) return;
    try {
      await supabaseDb.upsertChat({
        id: chatToSave.id,
        user_id: user.id,
        title: chatToSave.title,
        messages: chatToSave.messages
      });
      fetchChats(user.id);
    } catch (e) {}
  };

  const handleAuth = async (action: 'login' | 'register') => {
    // Deprecated for Supabase
    window.location.href = getGoogleAuthUrl(window.location.origin);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zenix_user');
    setAuthMode('login');
    setMessages([]);
    setChats([]);
    setActiveSession(null);
  };

  const saveSettings = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, settings })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('zenix_user', JSON.stringify(data.user));
        setSettingsOpen(false);
      }
    } catch (e) {}
  };

  const loadSession = (id: string) => {
    const c = chats.find(x => x.id === id);
    if (c) {
      setActiveSession(c.id);
      setMessages(c.messages.map(m => ({ ...m, isTyping: false })));
    }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await supabaseDb.deleteChat(id);
      fetchChats(user.id);
      if (activeSession === id) startNewSession();
    } catch (err) {}
  };

  const startNewSession = () => {
    setActiveSession(null);
    setMessages([]);
  };

  // Multi-TF: support max 3 images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 3 - selectedImages.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImages(prev => [...prev, reader.result as string].slice(0, 3));
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice Command
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Browser Anda tidak mendukung Voice Command. Gunakan Chrome.');
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = settings.language === 'English' ? 'en-US' : 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, settings.language]);

  const handleSubmit = async (e: React.FormEvent | null, customInput?: string) => {
    e?.preventDefault();
    const text = (customInput || input).trim();
    if ((!text && !selectedImages.length) || isLoading || !user) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', content: text,
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      image: selectedImages[0] || undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.images && m.images.length > 0 ? [
              { type: 'text', text: m.content || `Analisa ${m.images.length} chart ini dengan metode Top-Down Analysis` },
              ...m.images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }))
            ] : m.content
          })),
          model: selectedModel,
          settings,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Terjadi gangguan sementara pada ZENIX.`);
      }

      const data = await res.json();
      const content = cleanAIResponse(data.content || '');
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content, isTyping: true };
      const updatedMessages = [...newMessages, aiMsg];
      setMessages(updatedMessages);

      const sessionId = activeSession || Date.now().toString();
      const title = activeSession ? chats.find(c => c.id === activeSession)?.title || text.substring(0,20)+'...' : text.substring(0,20)+'...';
      const chatToSave: ChatSession = { id: sessionId, title, messages: updatedMessages };
      saveChat(chatToSave);
      setActiveSession(sessionId);

    } catch (err: any) {
      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: err?.message || 'ZENIX sedang melakukan kalibrasi sistem. Mohon coba lagi dalam beberapa menit. 🙏'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Share Signal Card as PNG download
  const handleShareCard = (msg: Message) => {
    setShareTarget(msg);
    setTimeout(() => {
      const el = shareCardRef.current;
      if (!el) return;
      
      // Load html2canvas from CDN instead of npm import
      const loadHtml2Canvas = () => new Promise<any>((resolve) => {
        if ((window as any).html2canvas) return resolve((window as any).html2canvas);
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve((window as any).html2canvas);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });

      loadHtml2Canvas().then(html2canvas => {
        if (html2canvas) {
          html2canvas(el, { scale: 2, backgroundColor: '#131314' }).then((canvas: any) => {
            const link = document.createElement('a');
            link.download = `ZENIX-Signal-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            setShareTarget(null);
          });
        } else {
          // Fallback to text share
          const text = encodeURIComponent(msg.content.slice(0, 200));
          window.open(`https://t.me/share/url?url=https://zacademy.ai&text=${text}`, '_blank');
          setShareTarget(null);
        }
      });
    }, 300);
  };

  const themeVars = settings.theme === 'dark' ? {
    bg: '#131314', sidebar: '#1e1f20', border: '#333538', 
    text: '#e3e3e3', textMuted: '#8e918f', inputBg: '#1e1f20', 
    userBubble: '#282a2c', aiBubble: 'transparent',
    hover: '#333538'
  } : {
    bg: '#ffffff', sidebar: '#f0f4f9', border: '#e3e3e3', 
    text: '#1f1f1f', textMuted: '#444746', inputBg: '#f0f4f9', 
    userBubble: '#f0f4f9', aiBubble: 'transparent',
    hover: '#e3e3e3'
  };

  const quickActions = [
    { label: 'Buat Sinyal', icon: <BarChart2 className="w-3.5 h-3.5" />, prompt: 'Buatkan signal trading untuk XAUUSD dengan RR 1:3' },
    { label: 'Cek Kondisi', icon: <Activity className="w-3.5 h-3.5" />, prompt: 'Bagaimana kondisi market global saat ini?' },
    { label: 'Analisa Crypto', icon: <Zap className="w-3.5 h-3.5" />, prompt: 'Analisa pergerakan Bitcoin (BTC) hari ini' },
  ];

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.replace(/^```[\w]*\n?/, '').replace(/```$/, '');
        return <pre key={i} style={{ background: themeVars.inputBg, padding: 12, borderRadius: 8, overflowX: 'auto', margin: '12px 0', border: `1px solid ${themeVars.border}`, fontSize: 13, fontFamily: 'monospace' }}><code>{code}</code></pre>;
      }
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };
  const renderInputArea = (isCentered: boolean) => (
    <div style={{ padding: isCentered ? '0' : '16px 24px 24px', background: isCentered ? 'transparent' : `linear-gradient(to top, ${themeVars.bg} 80%, transparent)`, width: '100%', maxWidth: 800, margin: '0 auto', flexShrink: 0, zIndex: 10 }}>
      <div style={{
        background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 24,
        padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Multi-Image Preview for Multi-Timeframe */}
        {selectedImages.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {selectedImages.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ position: 'absolute', top: -6, left: 2, background: '#7c3aed', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '1px 5px', zIndex: 1 }}>
                  {idx === 0 ? 'Daily' : idx === 1 ? 'H4' : 'M15'}
                </div>
                <img src={img} alt={`Chart ${idx + 1}`} style={{ height: 64, borderRadius: 8, border: `1px solid ${themeVars.border}` }} />
                <button onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, zIndex: 2 }}>
                  <X style={{ width: 10, height: 10 }} />
                </button>
              </div>
            ))}
            {selectedImages.length < 3 && (
              <button onClick={() => fileInputRef.current?.click()} style={{ height: 64, width: 48, borderRadius: 8, border: `2px dashed ${themeVars.border}`, background: 'transparent', color: themeVars.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10 }}>
                <Layers style={{ width: 14, height: 14 }} />
                +TF
              </button>
            )}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input} onChange={e => {
            setInput(e.target.value);
            if (e.target) {
              e.target.style.height = '44px';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
            }
          }} rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(null); } }}
          placeholder="Tanya ZENIX tentang analisa market..."
          disabled={isLoading}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            color: themeVars.text, fontSize: 15, resize: 'none', lineHeight: 1.5,
            fontFamily: 'Inter, sans-serif', padding: '4px 4px 12px',
            minHeight: 44, maxHeight: 200
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button title={selectedImages.length >= 3 ? 'Maks 3 chart' : 'Upload Chart'} onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: selectedImages.length >= 3 ? themeVars.border : themeVars.textMuted, cursor: selectedImages.length >= 3 ? 'not-allowed' : 'pointer', padding: 6, display: 'flex', borderRadius: '50%', position: 'relative' }} onMouseEnter={e => { if (selectedImages.length < 3) e.currentTarget.style.background = themeVars.hover; }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Camera style={{ width: 20, height: 20 }} />
              {selectedImages.length > 0 && <span style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#7c3aed', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{selectedImages.length}</span>}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple style={{ display: 'none' }} />

            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setModelDropdownOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', borderRadius: 20,
                padding: '6px 10px', color: themeVars.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s'
              }} onMouseEnter={e => { e.currentTarget.style.background = themeVars.hover; e.currentTarget.style.color = themeVars.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = themeVars.textMuted; }}>
                {selectedModel === 'zenix-fast' ? <Zap style={{ width: 14, height: 14, color: '#f59e0b' }} /> : <Brain style={{ width: 14, height: 14, color: '#7c3aed' }} />}
                {ZACADEMY_MODELS[selectedModel]?.name}
                <ChevronDown style={{ width: 14, height: 14 }} />
              </button>
              
              {modelDropdownOpen && (
                <div style={{
                  position: 'absolute', bottom: '120%', left: 0, minWidth: 220,
                  background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 12,
                  padding: 8, zIndex: 50, boxShadow: '0 -10px 40px rgba(0,0,0,0.2)', animation: 'fadeUp 0.2s ease'
                }}>
                  {(Object.entries(ZACADEMY_MODELS) as [ModelKey, typeof ZACADEMY_MODELS[ModelKey]][]).map(([key, model]) => (
                    <button key={key} onClick={() => { setSelectedModel(key); setModelDropdownOpen(false); }} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: selectedModel === key ? '#7c3aed15' : 'transparent',
                      border: 'none', borderRadius: 8, padding: '10px 12px',
                      color: selectedModel === key ? '#7c3aed' : themeVars.text,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { if (selectedModel !== key) e.currentTarget.style.background = themeVars.hover; }}
                      onMouseLeave={e => { if (selectedModel !== key) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {key === 'zenix-fast' ? <Zap style={{ width: 12, height: 12 }} /> : <Brain style={{ width: 12, height: 12 }} />}
                        {model.name}
                      </div>
                      <div style={{ fontSize: 11, color: themeVars.textMuted, marginTop: 4 }}>{model.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Voice Command Button */}
          <button title="Voice Command" onClick={toggleVoice} style={{ background: isListening ? 'rgba(239,68,68,0.15)' : 'none', border: 'none', color: isListening ? '#ef4444' : themeVars.textMuted, cursor: 'pointer', padding: 6, display: 'flex', borderRadius: '50%', transition: 'all 0.2s' }} onMouseEnter={e => { if (!isListening) e.currentTarget.style.background = themeVars.hover; }} onMouseLeave={e => { if (!isListening) e.currentTarget.style.background = 'transparent'; }}>
            {isListening ? <MicOff style={{ width: 20, height: 20 }} /> : <Mic style={{ width: 20, height: 20 }} />}
          </button>
          
          <button className="smooth-btn smooth-transition" onClick={() => handleSubmit(null)} disabled={(!input.trim() && !selectedImages.length) || isLoading} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: (input.trim() || selectedImages.length) && !isLoading ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : themeVars.border,
            border: 'none', cursor: (input.trim() || selectedImages.length) && !isLoading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: (input.trim() || selectedImages.length) ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
          }}>
            <Send style={{ width: 16, height: 16, color: (input.trim() || selectedImages.length) ? '#fff' : themeVars.textMuted, marginLeft: 2 }} />
          </button>
        </div>
      </div>
      {!isCentered && (
        <p style={{ textAlign: 'center', fontSize: 11, color: themeVars.textMuted, margin: '12px 0 0' }}>
          ZENIX AI Engine V1. Powered by ZAcademy.
        </p>
      )}
    </div>
  );

  if (isAppLoading) {
    return <div style={{ height: '100vh', background: '#131314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="typing-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: '#7c3aed' }} /></div>;
  }

  if (authMode) {
    return (
      <>
        <GlobalStyle />
        <div style={{ display: 'flex', height: '100vh', background: '#131314', color: '#e3e3e3', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel smooth-transition" style={{ width: 400, background: 'rgba(30, 31, 32, 0.7)', border: '1px solid #333538', borderRadius: 20, padding: 36, boxShadow: '0 24px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div className="smooth-hover smooth-transition" style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}>
                <img src="/logo-dark.jpg" alt="ZENIX AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                {authMode === 'login' ? 'Masuk ke ZENIX' : 'Daftar Akun ZENIX'}
              </h2>
              <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Mulai analisa market cerdas Anda</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authMode === 'login' ? (
                <>
                  <input className="smooth-input" type="email" placeholder="Alamat Email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{ background: '#1e1f20', border: '1px solid #333538', borderRadius: 12, padding: '14px 16px', color: '#e3e3e3', outline: 'none', fontSize: 14 }} />
                  <input className="smooth-input" type="password" placeholder="Password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{ background: '#1e1f20', border: '1px solid #333538', borderRadius: 12, padding: '14px 16px', color: '#e3e3e3', outline: 'none', fontSize: 14 }} />
                  
                  <button className="smooth-btn smooth-hover smooth-transition" onClick={() => handleAuth('login')} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' }}>
                    Masuk
                  </button>
                  <div style={{ textAlign: 'center', margin: '4px 0', fontSize: 13, color: '#8e918f' }}>
                    atau
                  </div>
                  <button className="smooth-btn smooth-hover smooth-transition" onClick={() => { window.location.href = getGoogleAuthUrl(window.location.origin); }} style={{ background: '#fff', color: '#111', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Lanjutkan dengan Google
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#8e918f' }}>
                    Belum punya akun? <span onClick={() => setAuthMode('register')} style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }}>Daftar sekarang</span>
                  </div>
                </>
              ) : (
                <>
                  <input className="smooth-input" type="text" placeholder="Nama Lengkap" value={regName} onChange={e=>setRegName(e.target.value)} style={{ background: '#1e1f20', border: '1px solid #333538', borderRadius: 12, padding: '14px 16px', color: '#e3e3e3', outline: 'none', fontSize: 14 }} />
                  <input className="smooth-input" type="email" placeholder="Alamat Email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{ background: '#1e1f20', border: '1px solid #333538', borderRadius: 12, padding: '14px 16px', color: '#e3e3e3', outline: 'none', fontSize: 14 }} />
                  <input className="smooth-input" type="password" placeholder="Password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{ background: '#1e1f20', border: '1px solid #333538', borderRadius: 12, padding: '14px 16px', color: '#e3e3e3', outline: 'none', fontSize: 14 }} />
                  
                  <button className="smooth-btn smooth-hover smooth-transition" onClick={() => { if(!regName) return alert('Nama harus diisi'); handleAuth('register'); }} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' }}>
                    Daftar Akun
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8e918f' }}>
                    Sudah punya akun? <span onClick={() => setAuthMode('login')} style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }}>Masuk di sini</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={{ display: 'flex', height: '100vh', background: themeVars.bg, color: themeVars.text, overflow: 'hidden', transition: 'background 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: sidebarOpen ? 240 : 0, minWidth: sidebarOpen ? 240 : 0,
          background: themeVars.sidebar, borderRight: `1px solid ${themeVars.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', flexShrink: 0,
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '20px 16px 12px' }}>
            <button className="smooth-transition smooth-hover" onClick={startNewSession} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'transparent', border: `1px solid ${themeVars.border}`, borderRadius: 12,
              padding: '12px 14px', color: themeVars.text, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = themeVars.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Percakapan baru
            </button>
          </div>

          {/* History */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
            <div style={{ fontSize: 11, color: themeVars.textMuted, fontWeight: 600, padding: '4px 10px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Riwayat Chat
            </div>
            {chats.map(session => (
              <div key={session.id} className="smooth-transition" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: activeSession === session.id ? themeVars.hover : 'transparent',
                borderRadius: 8, padding: '2px', marginBottom: '2px'
              }}
                onMouseEnter={e => { if(activeSession !== session.id) e.currentTarget.style.background = themeVars.border; }}
                onMouseLeave={e => { if(activeSession !== session.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div onClick={() => loadSession(session.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                  padding: '8px', color: activeSession === session.id ? themeVars.text : themeVars.textMuted,
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  <div style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: activeSession === session.id ? '#7c3aed' : 'transparent' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</span>
                </div>
                <button className="smooth-transition smooth-hover" onClick={(e) => deleteChat(e, session.id)} style={{
                  background: 'transparent', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>

          {/* Settings / User */}
          <div style={{ padding: '16px', borderTop: `1px solid ${themeVars.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                {user?.name.substring(0,2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: themeVars.textMuted, textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</div>
              </div>
            </div>
            <button onClick={() => setSettingsOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', borderRadius: 6, padding: '8px', color: themeVars.textMuted, cursor: 'pointer', fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = themeVars.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Settings style={{ width: 16, height: 16 }} /> Setelan Agent
            </button>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', borderRadius: 6, padding: '8px', color: '#ef4444', cursor: 'pointer', fontSize: 13, marginTop: 4 }} onMouseEnter={e => e.currentTarget.style.background = themeVars.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <LogIn style={{ width: 16, height: 16, transform: 'rotate(180deg)' }} /> Keluar
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${themeVars.border}`, background: themeVars.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: themeVars.textMuted, cursor: 'pointer', padding: 4, display: 'flex' }}>
                {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={settings.theme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'} alt="ZENIX AI" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: themeVars.text, letterSpacing: '-0.02em' }}>ZENIX AI</span>
              </div>
            </div>
            
            {/* Model Selector Moved to Input Area */}
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', animation: 'fadeUp 0.5s ease', maxWidth: 840, margin: '0 auto', width: '100%' }}>
                
                <div style={{ width: '100%', marginBottom: 40 }}>
                  <h1 style={{ 
                    fontSize: 48, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.03em',
                    background: 'linear-gradient(90deg, #c084fc, #ec4899, #f43f5e)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    display: 'inline-block'
                  }}>
                    Halo, {user?.name.split(' ')[0]}
                  </h1>
                  <h2 style={{ fontSize: 40, fontWeight: 500, margin: '0', color: themeVars.textMuted, letterSpacing: '-0.02em' }}>
                    Udah Siap Trading Hari Ini?
                  </h2>
                </div>

                {renderInputArea(true)}
                
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30, width: '100%' }}>
                  {quickActions.map(a => (
                    <button key={a.label} onClick={() => setInput(a.prompt)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 12,
                      padding: '12px 16px', color: themeVars.text, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = themeVars.hover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = themeVars.inputBg; }}
                    >
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
                {messages.map(msg => (
                  <div key={msg.id} className="msg-bubble" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 12 }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4, boxShadow: '0 4px 10px rgba(124,58,237,0.2)' }}>
                        <Brain style={{ width: 16, height: 16, color: '#fff' }} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '85%', padding: msg.role === 'assistant' ? '14px 0px' : '14px 18px', 
                      borderRadius: msg.role === 'user' ? '20px' : '0px',
                      background: msg.role === 'user' ? themeVars.userBubble : themeVars.aiBubble,
                      border: 'none',
                      fontSize: 15, lineHeight: 1.6, color: msg.role === 'user' ? '#e3e3e3' : themeVars.text,
                      whiteSpace: 'pre-wrap', boxShadow: 'none'
                    }}>
                      {/* Show images (multi-TF or single) */}
                      {msg.images && msg.images.length > 1 ? (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          {msg.images.map((img, idx) => (
                            <div key={idx} style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(124,58,237,0.85)', color: '#fff', borderRadius: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>
                                {idx === 0 ? 'Daily' : idx === 1 ? 'H4' : 'M15'}
                              </div>
                              <img src={img} alt={`TF ${idx + 1}`} style={{ height: 100, borderRadius: 8, border: `1px solid ${themeVars.border}` }} />
                            </div>
                          ))}
                        </div>
                      ) : msg.image ? (
                        <div style={{ marginBottom: 12 }}>
                          <img src={msg.image} alt="Uploaded chart" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: `1px solid ${themeVars.border}` }} />
                        </div>
                      ) : null}
                      {msg.role === 'assistant' && msg.isTyping ? (
                        <Typewriter text={msg.content} />
                      ) : (
                        renderMarkdown(msg.content)
                      )}
                      {/* Share Button - only for AI messages */}
                      {msg.role === 'assistant' && !msg.isTyping && (
                        <div style={{ marginTop: 8 }}>
                          <button onClick={() => handleShareCard(msg)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${themeVars.border}`, borderRadius: 8, padding: '4px 10px', color: themeVars.textMuted, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = themeVars.border; e.currentTarget.style.color = themeVars.textMuted; }}>
                            <Share2 style={{ width: 12, height: 12 }} /> Buat Kartu Sinyal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="msg-bubble" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain style={{ width: 16, height: 16, color: '#fff' }} /></div>
                    <div style={{ background: themeVars.aiBubble, border: `1px solid ${themeVars.border}`, borderRadius: '20px 20px 20px 4px', padding: '16px', display: 'flex', gap: 6 }}>
                      {[0, 1, 2].map(i => <span key={i} className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          {messages.length > 0 && renderInputArea(false)}

          {/* Share Signal Card Modal */}
          {shareTarget && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShareTarget(null)}>
              <div onClick={e => e.stopPropagation()}>
                <div ref={shareCardRef} style={{ width: 420, background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 100%)', borderRadius: 20, padding: 28, border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 0 60px rgba(124,58,237,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain style={{ width: 22, height: 22, color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>ZENIX AI</div>
                      <div style={{ fontSize: 11, color: '#8e918f' }}>ZAcademy Trading Assistant</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#8e918f' }}>{new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</div>
                  </div>
                  <div style={{ color: '#e3e3e3', fontSize: 13, lineHeight: 1.7, maxHeight: 280, overflow: 'hidden', whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                    {shareTarget.content.slice(0, 400)}{shareTarget.content.length > 400 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                    <div style={{ fontSize: 11, color: '#8e918f' }}>Powered by ZAcademy.ai</div>
                    <div style={{ fontSize: 11, fontWeight: 700, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DISCLAIMER: Bukan Financial Advice</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
                  <button onClick={() => handleShareCard(shareTarget)} style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>⬇️ Download PNG</button>
                  <button onClick={() => setShareTarget(null)} style={{ background: 'transparent', color: '#8e918f', border: '1px solid #333', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>Tutup</button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Modal */}
          {settingsOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 500, background: themeVars.bg, border: `1px solid ${themeVars.border}`, borderRadius: 20, padding: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'fadeUp 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: themeVars.text }}>Setelan ZENIX AI</h2>
                  <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', color: themeVars.textMuted, cursor: 'pointer' }}><X /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Theme */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: themeVars.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tema Tampilan</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setSettings({...settings, theme: 'dark'})} className="smooth-btn smooth-transition" style={{ flex: 1, padding: 12, borderRadius: 10, border: `2px solid ${settings.theme === 'dark' ? '#7c3aed' : themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                        <Moon style={{ width: 16, height: 16 }} /> Gelap
                      </button>
                      <button onClick={() => setSettings({...settings, theme: 'light'})} className="smooth-btn smooth-transition" style={{ flex: 1, padding: 12, borderRadius: 10, border: `2px solid ${settings.theme === 'light' ? '#7c3aed' : themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                        <Sun style={{ width: 16, height: 16 }} /> Terang
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: themeVars.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bahasa AI</label>
                    <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value})} style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, fontSize: 14, outline: 'none' }}>
                      <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                      <option value="English (US)">English (US)</option>
                      <option value="Mandarin">Mandarin (中文)</option>
                      <option value="Arab">Arab (العربية)</option>
                      <option value="Jerman">Jerman (Deutsch)</option>
                    </select>
                  </div>

                  {/* Personal Intelligence */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: themeVars.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kecerdasan Personal (Custom Instructions)</label>
                    <textarea 
                      value={settings.personalIntelligence} 
                      onChange={e => setSettings({...settings, personalIntelligence: e.target.value})}
                      placeholder="Contoh: Saya adalah swing trader, tolong fokus pada timeframe H4 dan Daily."
                      rows={3}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button onClick={() => setSettingsOpen(false)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'transparent', color: themeVars.textMuted, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                  <button onClick={saveSettings} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}>Simpan</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
