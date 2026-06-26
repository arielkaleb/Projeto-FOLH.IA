import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Mic, Send, ArrowLeft, User, MapPin, Lock, Mail, 
  Users, Sparkles, CornerDownRight, Volume2, VolumeX, Loader2, Play, Pause, Square, LogOut, CheckCircle2,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Interfaces to match server and types
interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  email: string;
  state?: string;
  city?: string;
}

interface CommunityMessage {
  id: string;
  userId: string;
  userNickname: string;
  userState: string;
  userCity: string;
  roomType: "city" | "state" | "country";
  roomState?: string;
  roomCity?: string;
  content: string;
  audioUrl?: string;
  replyToId?: string;
  replyToNickname?: string;
  replyToContent?: string;
  timestamp: string;
  isIA?: boolean;
}

const renderMessageContent = (text: string) => {
  if (!text) return null;
  // Split by ** to render bold correctly
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold text-verde-floresta">{part}</strong>;
    }
    return part;
  });
};

interface CommunityAreaProps {
  onBack: () => void;
}

// Base territorial completa oficial do Brasil (todos os 26 estados brasileiros + Distrito Federal)
const BRAZIL_STATES = [
  { name: "Acre", acronym: "AC" },
  { name: "Alagoas", acronym: "AL" },
  { name: "Amapá", acronym: "AP" },
  { name: "Amazonas", acronym: "AM" },
  { name: "Bahia", acronym: "BA" },
  { name: "Ceará", acronym: "CE" },
  { name: "Distrito Federal", acronym: "DF" },
  { name: "Espírito Santo", acronym: "ES" },
  { name: "Goiás", acronym: "GO" },
  { name: "Maranhão", acronym: "MA" },
  { name: "Mato Grosso", acronym: "MT" },
  { name: "Mato Grosso do Sul", acronym: "MS" },
  { name: "Minas Gerais", acronym: "MG" },
  { name: "Pará", acronym: "PA" },
  { name: "Paraíba", acronym: "PB" },
  { name: "Paraná", acronym: "PR" },
  { name: "Pernambuco", acronym: "PE" },
  { name: "Piauí", acronym: "PI" },
  { name: "Rio de Janeiro", acronym: "RJ" },
  { name: "Rio Grande do Norte", acronym: "RN" },
  { name: "Rio Grande do Sul", acronym: "RS" },
  { name: "Rondônia", acronym: "RO" },
  { name: "Roraima", acronym: "RR" },
  { name: "Santa Catarina", acronym: "SC" },
  { name: "São Paulo", acronym: "SP" },
  { name: "Sergipe", acronym: "SE" },
  { name: "Tocantins", acronym: "TO" }
];

export default function CommunityArea({ onBack }: CommunityAreaProps) {
  // Session / Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("folhia_community_user");
    return saved ? JSON.parse(saved) : null;
  });

  // UI state: "login" | "register" | "location" | "chat" | "recover"
  const [currentScreen, setCurrentScreen] = useState<"login" | "register" | "location" | "chat" | "recover">(() => {
    const savedUser = localStorage.getItem("folhia_community_user");
    if (!savedUser) return "login";
    const parsed = JSON.parse(savedUser);
    if (!parsed.state || !parsed.city) return "location";
    return "chat";
  });

  // Authentication Fields
  const [authName, setAuthName] = useState("");
  const [authNickname, setAuthNickname] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Recovery States
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState<string | null>(null);
  const [recoverLoading, setRecoverLoading] = useState(false);

  // Location Selector Fields
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Dynamic Cities from IBGE API and Smart Search States
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [cachedCities, setCachedCities] = useState<Record<string, string[]>>({});

  // Effect to load cities when state is selected
  useEffect(() => {
    if (!selectedState) {
      setCitiesList([]);
      setCitySearchQuery("");
      setSelectedCity("");
      return;
    }

    const stateObj = BRAZIL_STATES.find(s => s.name === selectedState);
    if (!stateObj) return;

    const acronym = stateObj.acronym;

    if (cachedCities[acronym]) {
      setCitiesList(cachedCities[acronym]);
      setCitySearchQuery("");
      setSelectedCity("");
      return;
    }

    setCitiesLoading(true);
    setLocationError("");
    
    // Fetch official IBGE municipalities API for the state
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${acronym}/municipios`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro de resposta da rede ao carregar municípios.");
        return res.json();
      })
      .then((data: Array<{ nome: string }>) => {
        const sortedCities = data.map(item => item.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCachedCities(prev => ({ ...prev, [acronym]: sortedCities }));
        setCitiesList(sortedCities);
        setCitySearchQuery("");
        setSelectedCity("");
      })
      .catch((err) => {
        console.error("Error loading municipalities from IBGE:", err);
        setLocationError("Não foi possível carregar os municípios oficiais via IBGE. Verifique sua conexão de internet.");
      })
      .finally(() => {
        setCitiesLoading(false);
      });
  }, [selectedState]);

  // Chat Fields
  const [roomType, setRoomType] = useState<"city" | "state" | "country">("country");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; nickname: string; state: string; city: string }>>([]);
  const [chatInputValue, setChatInputValue] = useState("");
  const [replyTarget, setReplyTarget] = useState<CommunityMessage | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [postMessageLoading, setPostMessageLoading] = useState(false);
  const [askingIALoadingId, setAskingIALoadingId] = useState<string | null>(null);

  // Audio Recorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSimulatedRecordingRef = useRef(false);
  const recordingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Report user presence and get online users in real-time
  const updatePresenceAndFetchOnline = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/community/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          roomType,
          state: currentUser.state || "",
          city: currentUser.city || ""
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
      }
    } catch (err) {
      console.error("Error updating community presence:", err);
    }
  };

  // Save current user securely in state & localstorage
  const handleSetCurrentUser = (user: UserProfile | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem("folhia_community_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("folhia_community_user");
    }
  };

  // Sign out
  const handleSignOut = () => {
    handleSetCurrentUser(null);
    setCurrentScreen("login");
    setMessages([]);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Por favor, preencha todos os campos.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/community/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer login.");
      }

      handleSetCurrentUser(data);
      if (!data.state || !data.city) {
        setCurrentScreen("location");
      } else {
        setCurrentScreen("chat");
      }
    } catch (err: any) {
      setAuthError(err.message || "E-mail ou senha incorretos.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authNickname || !authEmail || !authPassword || !authConfirmPassword) {
      setAuthError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError("As senhas não coincidem.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch("/api/community/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName,
          nickname: authNickname,
          email: authEmail,
          password: authPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar.");
      }

      handleSetCurrentUser(data);
      setCurrentScreen("location");
    } catch (err: any) {
      setAuthError(err.message || "Erro no cadastro. Tente outro nickname ou e-mail.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Recover credentials handler
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail) {
      setAuthError("Por favor, preencha o e-mail.");
      return;
    }
    setAuthError("");
    setRecoverLoading(true);
    setRecoveredPassword(null);

    try {
      const res = await fetch("/api/community/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoverEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cadastro não localizado.");
      }

      setRecoveredPassword(data.password);
    } catch (err: any) {
      setAuthError(err.message || "E-mail não encontrado.");
    } finally {
      setRecoverLoading(false);
    }
  };

  // Save location handler
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState || !selectedCity) {
      setLocationError("Por favor, selecione seu Estado e Cidade.");
      return;
    }
    setLocationError("");
    setLocationLoading(true);

    try {
      const res = await fetch("/api/community/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          state: selectedState,
          city: selectedCity
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar localização.");
      }

      handleSetCurrentUser(data);
      setCurrentScreen("chat");
    } catch (err: any) {
      setLocationError(err.message || "Não foi possível definir sua localização.");
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch messages from server
  const fetchMessages = async (showLoading = false) => {
    if (!currentUser) return;
    if (showLoading) setMessagesLoading(true);

    try {
      const queryParams = new URLSearchParams({
        roomType,
        state: currentUser.state || "",
        city: currentUser.city || ""
      });

      const res = await fetch(`/api/community/messages?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching community messages:", err);
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  // Start polling when in chat screen and room changes
  useEffect(() => {
    if (currentScreen === "chat" && currentUser) {
      fetchMessages(true);
      updatePresenceAndFetchOnline();

      // Poll every 3 seconds to get new messages and update presence in real-time
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(false);
        updatePresenceAndFetchOnline();
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentScreen, roomType, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Clean recording timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Send textual message
  const handleSendMessage = async () => {
    if (!chatInputValue.trim() || !currentUser) return;

    setPostMessageLoading(true);
    const contentToSend = chatInputValue;
    setChatInputValue("");
    const replyId = replyTarget?.id;
    setReplyTarget(null); // Clear reply target in UI immediately

    try {
      const res = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          roomType,
          state: currentUser.state,
          city: currentUser.city,
          content: contentToSend,
          replyToId: replyId
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Error posting message:", err);
    } finally {
      setPostMessageLoading(false);
    }
  };

  // Send an audio message (saved as base64 string directly)
  const sendAudioMessage = async (base64Audio: string) => {
    if (!currentUser) return;

    setPostMessageLoading(true);
    try {
      const res = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          roomType,
          state: currentUser.state,
          city: currentUser.city,
          content: "Enviou uma mensagem de áudio 🎙️",
          audioData: base64Audio
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Error sending audio message:", err);
    } finally {
      setPostMessageLoading(false);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendAudioMessage(base64Audio);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access blocked or not supported. Using fallback countryside audio note simulation:", err);
      // Fallback: Start typing/recording simulation
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      isSimulatedRecordingRef.current = true;
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (isRecording) {
      if (isSimulatedRecordingRef.current) {
        // Simple 2-seconds audio representation fallback
        const simulatedAudioBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFMmZtdCAAEgAAAAEAAQAIYFYAAOBVAAACABgAZGF0YQQAAAAAAA=="; // clean default silent base64 wave
        sendAudioMessage(simulatedAudioBase64);
        setIsRecording(false);
        isSimulatedRecordingRef.current = false;
      } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Trigger FOLH.IA reply to a specific message
  const handleAskIA = async (messageId: string) => {
    setAskingIALoadingId(messageId);
    try {
      const res = await fetch("/api/community/ask-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          roomType,
          state: currentUser?.state,
          city: currentUser?.city
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Error triggering IA reply:", err);
    } finally {
      setAskingIALoadingId(null);
    }
  };

  // Play/Pause audio messages
  const playAudio = (id: string, audioUrl: string) => {
    if (audioPlayingId === id) {
      // Toggle off
      setAudioPlayingId(null);
      const audioEl = document.getElementById(`audio-element-${id}`) as HTMLAudioElement;
      if (audioEl) audioEl.pause();
    } else {
      // Stop currently playing
      if (audioPlayingId) {
        const prevAudioEl = document.getElementById(`audio-element-${audioPlayingId}`) as HTMLAudioElement;
        if (prevAudioEl) prevAudioEl.pause();
      }
      setAudioPlayingId(id);
      setTimeout(() => {
        const audioEl = document.getElementById(`audio-element-${id}`) as HTMLAudioElement;
        if (audioEl) {
          audioEl.onended = () => setAudioPlayingId(null);
          audioEl.play().catch(e => {
            console.error("Playback failed:", e);
            setAudioPlayingId(null);
          });
        }
      }, 50);
    }
  };

  // Helper to format timestamps nicely (Brazilian standard)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  // Helper to get formatted recording duration
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  // Render Screens
  return (
    <div className="bg-white rounded-3xl border border-bege-card shadow-lg p-3 sm:p-6 min-h-[80vh] flex flex-col" id="community-area-container">
      
      {/* 1. LOGIN SCREEN */}
      {currentScreen === "login" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6"
          id="screen-login-container"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-verde-natureza/10 text-verde-natureza flex items-center justify-center mx-auto mb-3 border border-verde-natureza/20">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-2xl text-verde-floresta tracking-tight">Comunidade do Campo</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              O espaço seguro para produtores rurais conversarem, trocarem conselhos práticos e cooperarem mutuamente.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-login">
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2" id="login-error-msg">
                <span>⚠️ {authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-verde-floresta uppercase tracking-wider block">Seu E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="login-input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-verde-floresta uppercase tracking-wider block">Sua Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="login-input-password"
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setAuthError(""); setRecoveredPassword(null); setRecoverEmail(""); setCurrentScreen("recover"); }}
                className="text-xs font-bold text-verde-natureza hover:underline cursor-pointer"
                id="login-btn-forgot-password"
              >
                Esqueceu sua senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-verde-floresta hover:bg-verde-natureza text-white font-bold text-base py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              id="login-btn-submit"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando na Comunidade...
                </>
              ) : (
                "Entrar na Comunidade"
              )}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-bege-card pt-6">
            <p className="text-xs text-gray-500">
              Ainda não tem cadastro no espaço do produtor?
            </p>
            <button
              onClick={() => { setAuthError(""); setCurrentScreen("register"); }}
              className="mt-2 text-xs font-bold text-verde-natureza hover:underline cursor-pointer"
              id="login-btn-to-register"
            >
              CRIAR MEU CADASTRO RÁPIDO
            </button>
          </div>
        </motion.div>
      )}

      {/* 5. RECOVER PASSWORD SCREEN */}
      {currentScreen === "recover" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6"
          id="screen-recover-container"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-verde-natureza/10 text-verde-natureza flex items-center justify-center mx-auto mb-3 border border-verde-natureza/20">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-2xl text-verde-floresta tracking-tight">Recuperar Senha</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Informe seu e-mail cadastrado para recuperar sua senha de acesso ao sistema FOLH.IA.
            </p>
          </div>

          <form onSubmit={handleRecoverSubmit} className="space-y-4" id="form-recover">
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2" id="recover-error-msg">
                <span>⚠️ {authError}</span>
              </div>
            )}

            {recoveredPassword && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-medium space-y-2" id="recover-success-msg">
                <p className="font-bold">✅ Cadastro Localizado!</p>
                <p>Sua senha registrada é: <strong className="text-base text-verde-floresta font-mono tracking-wider bg-white px-2 py-1 rounded border border-green-300 select-all block mt-1 text-center">{recoveredPassword}</strong></p>
                <p className="text-[10px] text-gray-500 font-normal">Anote em um local seguro para não esquecer novamente.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-verde-floresta uppercase tracking-wider block">Seu E-mail Cadastrado</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="recover-input-email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recoverLoading}
              className="w-full bg-verde-floresta hover:bg-verde-natureza text-white font-bold text-base py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              id="recover-btn-submit"
            >
              {recoverLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Buscando cadastro...
                </>
              ) : (
                "Buscar Minha Senha"
              )}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-bege-card pt-6">
            <button
              onClick={() => { setAuthError(""); setCurrentScreen("login"); }}
              className="text-xs font-bold text-verde-natureza hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              id="recover-btn-back-to-login"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              VOLTAR PARA O LOGIN
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. REGISTER SCREEN */}
      {currentScreen === "register" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-4"
          id="screen-register-container"
        >
          <div className="text-center mb-6">
            <h2 className="font-display font-bold text-2xl text-verde-floresta tracking-tight">Cadastro Rápido do Produtor</h2>
            <p className="text-xs text-gray-500 mt-1 leading-normal">
              Cadastre-se de forma simples em poucos segundos para começar a conversar.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-3.5" id="form-register">
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2" id="register-error-msg">
                <span>⚠️ {authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="register-input-name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">Nickname (Nome Público que aparece nas conversas)</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: JoaoDaRoça, ChicoDoMilho"
                  value={authNickname}
                  onChange={(e) => setAuthNickname(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="register-input-nickname"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="register-input-email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">Criar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="register-input-password"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Repita sua senha"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-colors"
                  required
                  id="register-input-confirmpass"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-verde-floresta hover:bg-verde-natureza text-white font-bold text-base py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              id="register-btn-submit"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Criar Cadastro e Continuar"
              )}
            </button>
          </form>

          <div className="text-center mt-5 border-t border-bege-card pt-5">
            <p className="text-xs text-gray-500">
              Já possui uma conta na comunidade?
            </p>
            <button
              onClick={() => { setAuthError(""); setCurrentScreen("login"); }}
              className="mt-2 text-xs font-bold text-verde-natureza hover:underline cursor-pointer"
              id="register-btn-to-login"
            >
              Acessar minha conta cadastrada
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. LOCATION SELECTION SCREEN */}
      {currentScreen === "location" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-6"
          id="screen-location-container"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-dourado-suave/10 text-dourado-suave flex items-center justify-center mx-auto mb-3 border border-dourado-suave/20 animate-pulse">
              <MapPin className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-2xl text-verde-floresta tracking-tight">Onde fica sua terra?</h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              O FOLH.IA organiza salas exclusivas baseadas no seu estado e município para você debater os assuntos da sua região!
            </p>
          </div>

          <form onSubmit={handleLocationSubmit} className="space-y-5" id="form-location">
            {locationError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium" id="location-error-msg">
                ⚠️ {locationError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-verde-floresta uppercase tracking-wider block">1. Escolha seu Estado</label>
              <select
                value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); }}
                className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3.5 px-4 text-sm font-semibold outline-none transition-all cursor-pointer"
                required
                id="location-select-state"
              >
                <option value="">Selecione seu Estado...</option>
                {BRAZIL_STATES.map((st) => (
                  <option key={st.acronym} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-verde-floresta uppercase tracking-wider block">2. Pesquise sua Cidade</label>
              
              {!selectedState ? (
                <div className="w-full bg-bege-claro/30 border border-bege-card rounded-2xl py-3.5 px-4 text-xs font-semibold text-gray-400">
                  Selecione um Estado primeiro para ver as cidades.
                </div>
              ) : citiesLoading ? (
                <div className="w-full bg-bege-claro/50 border border-bege-card rounded-2xl py-3.5 px-4 text-xs font-semibold text-verde-natureza flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando todos os municípios oficiais pelo IBGE...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Pesquise por nome... Ex: Rio Verde"
                      value={citySearchQuery}
                      onChange={(e) => {
                        setCitySearchQuery(e.target.value);
                        // If exact match of a city exists in current list, select it
                        const exact = citiesList.find(c => c.toLowerCase() === e.target.value.trim().toLowerCase());
                        if (exact) setSelectedCity(exact);
                      }}
                      className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-all"
                      id="location-search-city"
                    />
                  </div>

                  {/* Suggestion List */}
                  <div className="border border-bege-card rounded-2xl max-h-48 overflow-y-auto bg-white divide-y divide-bege-card/30 shadow-sm" id="city-suggestions-list">
                    {citiesList
                      .filter(city => {
                        if (!citySearchQuery) return true;
                        const normCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        const normQuery = citySearchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        return normCity.includes(normQuery);
                      })
                      .slice(0, 50)
                      .map((city) => {
                        const isSelected = selectedCity === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setSelectedCity(city);
                              setCitySearchQuery(city);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected 
                                ? "bg-verde-natureza/10 text-verde-floresta font-bold" 
                                : "hover:bg-bege-claro/40 text-gray-700"
                            }`}
                          >
                            <span>{city}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-verde-natureza" />}
                          </button>
                        );
                      })}

                    {citiesList.filter(city => {
                      const normCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      const normQuery = citySearchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      return normCity.includes(normQuery);
                    }).length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-400 font-semibold">
                        Nenhum município encontrado com "{citySearchQuery}".
                      </div>
                    )}
                  </div>

                  {selectedCity && (
                    <div className="p-2.5 rounded-xl bg-verde-natureza/5 border border-verde-natureza/20 text-verde-floresta text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-verde-natureza" />
                      <span>Selecionado: {selectedCity}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={locationLoading || citiesLoading || !selectedState || !selectedCity}
              className="w-full bg-verde-floresta hover:bg-verde-natureza text-white font-bold text-base py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
              id="location-btn-submit"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Organizando suas salas...
                </>
              ) : (
                "Entrar nas minhas comunidades"
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* 4. CHAT COMMUNITY ROOMS */}
      {currentScreen === "chat" && currentUser && (
        <div className="flex-1 flex flex-col" id="screen-chat-container">
          
          {/* Header Row: User Info, Rooms Nav, and Sign out */}
          <div className="border-b border-bege-card pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3" id="chat-header-panel">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-verde-natureza flex items-center justify-center text-white font-bold shadow-sm">
                {currentUser.nickname.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-verde-floresta">{currentUser.nickname}</span>
                  <span className="text-[10px] bg-verde-natureza/10 text-verde-natureza px-1.5 py-0.5 rounded-full font-bold">Produtor</span>
                </div>
                <div className="text-[11px] text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-dourado-suave shrink-0" />
                  {currentUser.city} - {currentUser.state}
                </div>
              </div>
            </div>

            {/* Room Switching Quick Toggles */}
            <div className="flex items-center bg-bege-claro/50 p-1 rounded-2xl border border-bege-card" id="room-toggles-container">
              <button
                onClick={() => setRoomType("city")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roomType === "city" 
                    ? "bg-verde-floresta text-white shadow-sm" 
                    : "text-verde-floresta hover:bg-white/60"
                }`}
                id="room-toggle-city"
              >
                Minha Cidade
              </button>
              <button
                onClick={() => setRoomType("state")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roomType === "state" 
                    ? "bg-verde-floresta text-white shadow-sm" 
                    : "text-verde-floresta hover:bg-white/60"
                }`}
                id="room-toggle-state"
              >
                Meu Estado
              </button>
              <button
                onClick={() => setRoomType("country")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roomType === "country" 
                    ? "bg-verde-floresta text-white shadow-sm" 
                    : "text-verde-floresta hover:bg-white/60"
                }`}
                id="room-toggle-country"
              >
                Brasil Inteiro
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 self-end md:self-auto cursor-pointer"
              title="Sair da Conta"
              id="chat-btn-signout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Active Room Title Banner */}
          <div className="bg-bege-claro/30 rounded-2xl p-3 border border-bege-card flex items-center justify-between mb-2" id="chat-active-room-banner">
            <div className="flex items-center space-x-2.5">
              <MessageSquare className="w-4 h-4 text-verde-natureza" />
              <span className="text-xs font-bold text-verde-floresta">
                {roomType === "city" && `Sala Local de ${currentUser.city} - ${currentUser.state}`}
                {roomType === "state" && `Comunidade Estadual de ${currentUser.state}`}
                {roomType === "country" && "Comunidade Nacional — Brasil Inteiro"}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping"></span>
              <span>Ativa</span>
            </div>
          </div>

          {/* Real-time Online Members list */}
          <div className="bg-bege-claro/20 border border-bege-card rounded-2xl p-2.5 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 overflow-hidden" id="chat-online-members">
            <div className="flex items-center gap-1.5 shrink-0 pr-2 sm:border-r sm:border-bege-card/60 text-[11px] font-bold text-verde-floresta">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
              <span>{onlineUsers.length} {onlineUsers.length === 1 ? "Produtor Online" : "Produtores Online"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-h-16 sm:max-h-8 text-[10px]">
              {onlineUsers.map((u) => {
                const isMe = u.userId === currentUser.id;
                return (
                  <div key={u.userId} className={`flex items-center space-x-1 border px-2 py-0.5 rounded-full shrink-0 ${
                    isMe 
                      ? "bg-verde-natureza/10 border-verde-natureza/30 text-verde-floresta font-bold" 
                      : "bg-white border-bege-card/60 text-gray-700"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                    <span>@{u.nickname}</span>
                    <span className="text-gray-400 font-mono text-[8px] shrink-0">({u.city})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Messages Feed Viewport */}
          <div className="flex-1 overflow-y-auto max-h-[48vh] min-h-[35vh] space-y-3.5 pr-2 border-b border-bege-card pb-4 mb-4" id="chat-messages-feed">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-verde-natureza" />
                <span className="text-xs font-semibold">Carregando conversas do campo...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                <span className="text-xs font-semibold">Nenhuma conversa por aqui ainda.</span>
                <span className="text-[10px] mt-0.5">Seja o primeiro a enviar uma mensagem para os produtores!</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.userId === currentUser.id;
                const isSystemIA = msg.isIA === true;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    id={`msg-container-${msg.id}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative ${
                        isMine 
                          ? "bg-dourado-suave text-white rounded-tr-none border border-yellow-600/20" 
                          : isSystemIA
                            ? "bg-emerald-50 border border-emerald-200 text-gray-800 rounded-tl-none"
                            : "bg-bege-claro/70 text-gray-800 rounded-tl-none"
                      }`}
                      id={`msg-box-${msg.id}`}
                    >
                      {/* Sender Header */}
                      {isMine ? (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-white/80">
                          <span className="text-yellow-100">Você</span>
                          <span className="font-mono text-[9px] font-bold bg-white/25 px-1.5 py-0.5 rounded text-white">
                            (você)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-gray-400">
                          <span className={isSystemIA ? "text-emerald-700 font-display flex items-center gap-1" : "text-verde-floresta"}>
                            {isSystemIA && <Sparkles className="w-3 h-3 text-dourado-suave shrink-0 animate-pulse" />}
                            {msg.userNickname}
                          </span>
                          {!isSystemIA && (
                            <span className="font-mono text-[9px] font-normal bg-bege-card px-1.5 py-0.5 rounded text-gray-500">
                              {msg.userCity} - {msg.userState}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Replying Context Indicator */}
                      {msg.replyToId && (
                        <div className={`p-2 mb-2 rounded-lg text-[11px] flex items-start gap-1 ${
                          isMine 
                            ? "bg-white/10 text-white/90 border-l-2 border-white/40" 
                            : "bg-white/80 text-gray-500 border-l-2 border-verde-natureza"
                        }`}>
                          <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[10px]">
                              Respondendo a @{msg.replyToNickname}
                            </span>
                            <span className="line-clamp-1 italic">{msg.replyToContent}</span>
                          </div>
                        </div>
                      )}

                      {/* Message Content (supports formatted text) */}
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {renderMessageContent(msg.content)}
                      </p>

                      {/* Playable audio player wrapper */}
                      {msg.audioUrl && (
                        <div className="mt-2.5 flex items-center gap-2 bg-black/5 rounded-lg p-2 max-w-xs">
                          <button
                            onClick={() => playAudio(msg.id, msg.audioUrl!)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                              isMine ? "bg-white/20 text-white hover:bg-white/30" : "bg-verde-floresta text-white hover:bg-verde-natureza"
                            }`}
                            id={`play-btn-${msg.id}`}
                          >
                            {audioPlayingId === msg.id ? (
                              <Square className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                          <audio id={`audio-element-${msg.id}`} src={msg.audioUrl} className="hidden" />
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-bold ${isMine ? "text-white/80" : "text-gray-500"}`}>
                              Mensagem de Voz
                            </span>
                            <span className={`text-[8px] font-mono ${isMine ? "text-white/60" : "text-gray-400"}`}>
                              Clique para reproduzir
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Footer Row: Timestamp + Quick Interaction buttons */}
                      <div className="mt-1 flex items-center justify-end space-x-3 text-[9px] text-gray-400">
                        <span className={isMine ? "text-white/60 font-mono" : "font-mono"}>
                          {formatTime(msg.timestamp)}
                        </span>
                        
                        {/* Reply action click */}
                        {!isSystemIA && (
                          <button
                            onClick={() => setReplyTarget(msg)}
                            className={`hover:underline cursor-pointer font-bold ${isMine ? "text-white/80 hover:text-white" : "text-verde-natureza hover:text-verde-floresta"}`}
                            id={`reply-btn-${msg.id}`}
                          >
                            Responder
                          </button>
                        )}

                        {/* Ask IA Button (only if not an IA message itself, and is a textual message) */}
                        {!isSystemIA && !msg.audioUrl && (
                          <button
                            onClick={() => handleAskIA(msg.id)}
                            disabled={askingIALoadingId !== null}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-all cursor-pointer font-bold ${
                              isMine 
                                ? "border-white/20 text-white hover:bg-white/10" 
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            title="Chamar o consultor virtual para responder a esta mensagem"
                            id={`ask-ia-${msg.id}`}
                          >
                            {askingIALoadingId === msg.id ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-700" />
                            ) : (
                              <Sparkles className="w-2.5 h-2.5 text-dourado-suave" />
                            )}
                            Perguntar à IA
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Target Info Banner (visible when drafting a reply) */}
          {replyTarget && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-bege-claro border border-bege-card p-2.5 rounded-2xl flex items-center justify-between mb-3"
              id="chat-reply-banner"
            >
              <div className="flex items-start space-x-2 text-xs">
                <CornerDownRight className="w-4 h-4 text-verde-natureza shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-verde-floresta text-[11px]">
                    Respondendo a @{replyTarget.userNickname}
                  </span>
                  <span className="text-gray-500 line-clamp-1 italic">{replyTarget.content}</span>
                </div>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
                id="chat-reply-btn-clear"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Active Audio Recording HUD bar */}
          {isRecording && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center justify-between mb-3 animate-pulse" id="chat-recording-hud">
              <div className="flex items-center space-x-3 text-red-600 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping"></span>
                <span>Gravando áudio para o grupo... {formatDuration(recordingSeconds)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                id="chat-btn-stoprecording"
              >
                <Square className="w-3 h-3 fill-current text-white shrink-0" />
                Enviar Áudio
              </button>
            </div>
          )}

          {/* Footer Text Input Bar */}
          {!isRecording && (
            <div className="flex items-center space-x-2" id="chat-input-controls">
              
              {/* Record Audio Button */}
              <button
                onClick={startRecording}
                disabled={postMessageLoading}
                className="w-12 h-12 rounded-2xl bg-bege-claro hover:bg-bege-card text-verde-floresta border border-bege-card flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Gravar Mensagem de Voz"
                id="chat-btn-mic"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Chat Text Input field */}
              <input
                type="text"
                placeholder="Escreva sua mensagem ou pergunta para a comunidade..."
                value={chatInputValue}
                onChange={(e) => setChatInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                disabled={postMessageLoading}
                className="flex-1 bg-bege-claro/50 border border-bege-card focus:border-verde-natureza rounded-2xl py-3 px-4 text-sm font-medium outline-none transition-colors disabled:opacity-50"
                id="chat-input-text"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={postMessageLoading || !chatInputValue.trim()}
                className="w-12 h-12 rounded-2xl bg-verde-floresta hover:bg-verde-natureza text-white flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
                id="chat-btn-send"
              >
                {postMessageLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="text-center mt-3">
            <span className="text-[10px] text-gray-400">
              Sua privacidade é nossa prioridade absoluta. O sistema exibe apenas seu nickname público, cidade e estado.
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

interface XProps {
  className?: string;
}
function X({ className }: XProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
