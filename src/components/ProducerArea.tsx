import React, { useState, useRef, useEffect } from "react";
import { 
  Send, Mic, Volume2, VolumeX, Share2, FileText, Mail, 
  Upload, Sparkles, RefreshCw, X, File, AlertCircle, Play, Pause, Square,
  Eye, Type, ArrowLeft, Accessibility
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message } from "../types";

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function convertPCMToWavBlob(base64PCM: string, sampleRate: number): Blob {
  const binary = atob(base64PCM);
  const len = binary.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + len, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (1 = mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, len, true);

  // Copy raw binary base64 PCM data directly into output array buffer from byte 44
  const uint8Output = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    uint8Output[i] = binary.charCodeAt(i);
  }

  return new Blob([buffer], { type: 'audio/wav' });
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

interface ProducerAreaProps {
  onBack: () => void;
}

export default function ProducerArea({ onBack }: ProducerAreaProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("folhia_producer_messages");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any) => ({
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
            }));
          }
        } catch (e) {
          console.error("Error parsing saved messages:", e);
        }
      }
    }
    return [
      {
        id: "welcome-msg",
        role: "model",
        content: "Olá! Seja muito bem-vindo à FOLH.IA. Sou sua consultora para leis da natureza e terras. Pode perguntar o que quiser, do seu jeito! Por exemplo: 'Posso plantar perto de um rio?' ou 'O que é APP?'. Se tiver algum documento ou papel do CAR, pode me enviar também para eu ler para você.",
        timestamp: new Date()
      }
    ];
  });

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const playbackSpeedRef = useRef<number>(1.0);
  const speechCharIndexRef = useRef<number>(0);

  // Sync messages with localStorage
  useEffect(() => {
    localStorage.setItem("folhia_producer_messages", JSON.stringify(messages));
  }, [messages]);

  // Keep playbackSpeedRef in sync with playbackSpeed state to avoid stale closures and update current playing audio
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioElementRef.current) {
      try {
        audioElementRef.current.playbackRate = playbackSpeed;
      } catch (e) {
        console.error("Erro ao aplicar velocidade no áudio ativo:", e);
      }
    }
  }, [playbackSpeed]);

  const handleRefreshChat = () => {
    setIsLoading(false); // Reset loading state if stuck

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("folhia_producer_messages");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any connection errors or temporary system glitches
            const cleanMessages = parsed.filter((m: any) => 
              m && 
              !m.id?.startsWith("error-") && 
              m.role !== "error" &&
              !(typeof m.content === "string" && (
                m.content.includes("Sinto muito, tive um probleminha") ||
                m.content.includes("Resposta indisponível")
              ))
            );

            if (cleanMessages.length > 0) {
              setMessages(cleanMessages.map((m: any) => ({
                ...m,
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
              })));
              localStorage.setItem("folhia_producer_messages", JSON.stringify(cleanMessages));
            } else {
              // Fallback to default welcome message
              const defaultWelcome = [
                {
                  id: "welcome-msg",
                  role: "model",
                  content: "Olá! Seja muito bem-vindo à FOLH.IA. Sou sua consultora para leis da natureza e terras. Pode perguntar o que quiser, do seu jeito! Por exemplo: 'Posso plantar perto de um rio?' ou 'O que é APP?'. Se tiver algum documento ou papel do CAR, pode me enviar também para eu ler para você.",
                  timestamp: new Date()
                }
              ];
              setMessages(defaultWelcome);
              localStorage.setItem("folhia_producer_messages", JSON.stringify(defaultWelcome));
            }
          }
        } catch (e) {
          console.error("Error parsing saved messages on refresh:", e);
        }
      }
    }

    // Scroll to the bottom of the viewport
    setTimeout(() => {
      const container = document.getElementById("messages-viewport");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const [showOptions, setShowOptions] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState("");
  const [showPrintableChat, setShowPrintableChat] = useState(false);
  
  // Accessibility states
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xl">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<"instant" | "ia">("ia");
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  
  // Style helpers for accessibility support
  const getFontSizeClass = () => {
    if (fontSize === "large") return "text-base sm:text-lg";
    if (fontSize === "xl") return "text-lg sm:text-xl";
    return "text-xs sm:text-sm";
  };

  const getUserBubbleClass = () => {
    if (highContrast) {
      return "bg-black text-white border-2 border-white rounded-br-none font-bold";
    }
    return "bg-verde-floresta text-white rounded-br-none";
  };

  const getModelBubbleClass = () => {
    if (highContrast) {
      return "bg-white text-black border-2 border-black rounded-bl-none font-bold";
    }
    return "bg-white text-gray-800 border border-bege-card rounded-bl-none";
  };

  const getChatViewportClass = () => {
    if (highContrast) {
      return "flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-black border-y-2 border-white";
    }
    return "flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-bege-claro/50";
  };

  const getWrapperClass = () => {
    if (highContrast) {
      return "w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[80vh] bg-black text-white rounded-3xl shadow-md border-4 border-white overflow-hidden relative";
    }
    return "w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[80vh] bg-white rounded-3xl shadow-md border border-bege-card overflow-hidden relative";
  };
  
  // File attachments state
  const [attachedFile, setAttachedFile] = useState<{ name: string; mimeType: string; data: string; size: number } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isUsingSpeechSynthesisRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Cleanup audio sources on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Timer for recording simulation
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  const stopCurrentAudio = () => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      } catch (e) {}
      audioElementRef.current = null;
    }
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Already closed
      }
      audioContextRef.current = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    isUsingSpeechSynthesisRef.current = false;
    speechCharIndexRef.current = 0;
    setAudioPlayingId(null);
    setIsAudioPaused(false);
  };

  const playPCM24kHz = (base64: string, messageId: string) => {
    try {
      stopCurrentAudio();
      isUsingSpeechSynthesisRef.current = false;
      speechCharIndexRef.current = 0;
      setLoadingAudioId(null);
      setAudioPlayingId(messageId);
      setIsAudioPaused(false);

      const wavBlob = convertPCMToWavBlob(base64, 24000);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.muted = false;
      audio.volume = 1.0;
      // Force playback rate using closure-safe ref
      audio.playbackRate = playbackSpeedRef.current;
      
      audio.onplay = () => {
        audio.playbackRate = playbackSpeedRef.current;
      };
      
      audio.onplaying = () => {
        audio.playbackRate = playbackSpeedRef.current;
      };

      audio.oncanplay = () => {
        audio.playbackRate = playbackSpeedRef.current;
      };
      
      audio.onloadedmetadata = () => {
        audio.playbackRate = playbackSpeedRef.current;
      };

      audio.onended = () => {
        setAudioPlayingId((currentId) => {
          if (currentId === messageId) {
            setIsAudioPaused(false);
            speechCharIndexRef.current = 0;
            return null;
          }
          return currentId;
        });
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setAudioPlayingId(null);
        setIsAudioPaused(false);
        speechCharIndexRef.current = 0;
      };
      
      audioElementRef.current = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("FALHA AO TOCAR AUDIO:", err);
          // If aborted by a sudden manual pause, keep state as-is
          if (err.name !== "AbortError") {
            setAudioPlayingId(null);
            setIsAudioPaused(false);
          }
        });
      }
    } catch (err) {
      console.error("Erro ao reproduzir áudio:", err);
      setAudioPlayingId(null);
      setIsAudioPaused(false);
    }
  };

  const getBestFemaleVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prefer Portuguese (Brazil) female voices
    const femaleVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      return (lang.startsWith("pt") || lang.startsWith("pt-br")) && (
        name.includes("maria") ||
        name.includes("luciana") ||
        name.includes("heloisa") ||
        name.includes("helô") ||
        name.includes("female") ||
        name.includes("mulher") ||
        name.includes("zira") ||
        name.includes("samantha") ||
        name.includes("sandra") ||
        (!name.includes("daniel") && !name.includes("male") && !name.includes("homem"))
      );
    });
    if (femaleVoice) return femaleVoice;
    // Fallback to any pt voice
    return voices.find(v => v.lang.toLowerCase().startsWith("pt")) || null;
  };

  // Speaks a message response on demand using local Synthesis or /api/tts
  const listenToMessage = async (message: Message) => {
    // Clean text once so it's consistent for both play and pause/resume logic
    // Replace FOLH.IA with folha ia
    const cleanText = message.content
      .replace(/[\*\#\_\-\>\`]/g, " ")
      .replace(/FOLH\.IA/gi, "folha ia")
      .replace(/\s+/g, " ")
      .trim();

    if (audioPlayingId === message.id) {
      if (isAudioPaused) {
        // Resume playback
        if (isUsingSpeechSynthesisRef.current) {
          if (window.speechSynthesis) {
            // Workaround Chrome's silent/freezing window.speechSynthesis.resume() bug:
            // cancel existing and start speaking from the last character index!
            try {
              window.speechSynthesis.cancel();
              const remainingText = cleanText.substring(speechCharIndexRef.current);
              if (remainingText.trim()) {
                const newUtterance = new SpeechSynthesisUtterance(remainingText);
                newUtterance.lang = "pt-BR";
                newUtterance.rate = playbackSpeedRef.current;
                const voice = getBestFemaleVoice();
                if (voice) {
                  newUtterance.voice = voice;
                }
                
                const baseIndex = speechCharIndexRef.current;
                newUtterance.onboundary = (event) => {
                  if (event.name === "word") {
                    speechCharIndexRef.current = baseIndex + event.charIndex;
                  }
                };
                
                newUtterance.onend = () => {
                  setAudioPlayingId((current) => current === message.id ? null : current);
                  setIsAudioPaused(false);
                  speechCharIndexRef.current = 0;
                };
                newUtterance.onerror = () => {
                  setAudioPlayingId((current) => current === message.id ? null : current);
                  setIsAudioPaused(false);
                  speechCharIndexRef.current = 0;
                };
                
                window.speechSynthesis.speak(newUtterance);
              } else {
                setAudioPlayingId(null);
                setIsAudioPaused(false);
                speechCharIndexRef.current = 0;
              }
            } catch (e) {
              console.error("Erro ao retomar SpeechSynthesis:", e);
            }
          }
        } else {
          if (audioElementRef.current) {
            audioElementRef.current.muted = false;
            audioElementRef.current.volume = 1.0;
            audioElementRef.current.playbackRate = playbackSpeedRef.current;
            const playPromise = audioElementRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.error("Erro ao retomar áudio:", e);
              });
            }
          }
        }
        setIsAudioPaused(false);
      } else {
        // Pause playback
        if (isUsingSpeechSynthesisRef.current) {
          if (window.speechSynthesis) {
            window.speechSynthesis.pause();
          }
        } else {
          if (audioElementRef.current) {
            try {
              audioElementRef.current.pause();
            } catch (e) {
              console.error("Erro ao pausar áudio:", e);
            }
          }
        }
        setIsAudioPaused(true);
      }
      return;
    }

    // Stop anything else first
    stopCurrentAudio();
    setIsAudioPaused(false);

    if (voiceEngine === "instant") {
      // 1. CLIENT-SIDE WEB SPEECH API (Instant, No Delay, works 100% offline or on slow mobile networks)
      try {
        isUsingSpeechSynthesisRef.current = true;
        setAudioPlayingId(message.id);
        speechCharIndexRef.current = 0;
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "pt-BR";
        utterance.rate = playbackSpeedRef.current; // Standard rate supported!
        const voice = getBestFemaleVoice();
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onboundary = (event) => {
          if (event.name === "word") {
            speechCharIndexRef.current = event.charIndex;
          }
        };

        utterance.onend = () => {
          setAudioPlayingId((current) => current === message.id ? null : current);
          setIsAudioPaused(false);
          speechCharIndexRef.current = 0;
        };
        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e);
          setAudioPlayingId((current) => current === message.id ? null : current);
          setIsAudioPaused(false);
          speechCharIndexRef.current = 0;
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Falha no sintetizador nativo:", err);
        setAudioPlayingId(null);
        setIsAudioPaused(false);
      }
    } else {
      // 2. PREMIUM IA VOICE VIA GEMINI (Reads the entire conversational text for maximum naturalness and complete explanations)
      try {
        setLoadingAudioId(message.id);
        
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText }),
        });

        if (!response.ok) {
          throw new Error("Erro na geração de áudio.");
        }

        const data = await response.json();
        setLoadingAudioId(null);
        if (data.audio) {
          playPCM24kHz(data.audio, message.id);
        } else {
          throw new Error("Nenhum áudio recebido.");
        }
      } catch (err) {
        console.error("Falha ao gerar TTS da IA. Utilizando sintetizador nativo como fallback de acessibilidade...", err);
        setLoadingAudioId(null);
        
        // Instant Accessibility Fallback to browser Web Speech API
        try {
          isUsingSpeechSynthesisRef.current = true;
          setAudioPlayingId(message.id);
          speechCharIndexRef.current = 0;
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = "pt-BR";
          utterance.rate = playbackSpeedRef.current;
          const voice = getBestFemaleVoice();
          if (voice) {
            utterance.voice = voice;
          }

          utterance.onboundary = (event) => {
            if (event.name === "word") {
              speechCharIndexRef.current = event.charIndex;
            }
          };

          utterance.onend = () => {
            setAudioPlayingId((current) => current === message.id ? null : current);
            setIsAudioPaused(false);
            speechCharIndexRef.current = 0;
          };
          utterance.onerror = () => {
            setAudioPlayingId((current) => current === message.id ? null : current);
            setIsAudioPaused(false);
            speechCharIndexRef.current = 0;
          };

          window.speechSynthesis.speak(utterance);
        } catch (fallbackErr) {
          console.error("Falha total no áudio:", fallbackErr);
          setAudioPlayingId(null);
          setIsAudioPaused(false);
        }
      }
    }
  };

  // Handles text submission
  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputValue;
    if (!textToSend.trim() && !attachedFile) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend || "Enviou um documento para análise.",
      timestamp: new Date(),
      file: attachedFile ? {
        name: attachedFile.name,
        mimeType: attachedFile.mimeType,
        size: attachedFile.size
      } : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    const tempFile = attachedFile;
    setAttachedFile(null); // Clear input

    try {
      // Map previous messages to simple role/content format
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch("/api/chat/producer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: textToSend }],
          file: tempFile ? {
            name: tempFile.name,
            mimeType: tempFile.mimeType,
            data: tempFile.data
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Resposta indisponível do servidor.");
      }

      const data = await response.json();
      const modelMsg: Message = {
        id: `model-${Date.now()}`,
        role: "model",
        content: data.text,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, modelMsg]);
      
      // Auto-narrate response has been removed upon user request - user must select to play audio manually.

    } catch (err: any) {
      console.error("Erro na comunicação:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "model",
          content: "Sinto muito, tive um probleminha para me conectar com o sistema. Por favor, tente perguntar novamente ou verifique se sua internet está ativa.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulated Voice Messages Options for Quick Selection & Real microphone simulation
  const simulateVoiceMessage = (promptText: string) => {
    stopCurrentAudio();
    setIsRecording(true);
    setInputValue("");
    
    // Simulate typing text derived from speech after 2.5 seconds
    setTimeout(() => {
      setIsRecording(false);
      setInputValue(promptText);
    }, 2500);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file as Base64
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: reader.result as string
      });
    };
    reader.onerror = () => {
      alert("Não foi possível carregar este arquivo.");
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Discretely triggers browser's standard Print dialog formatted nicely as a legal summary
  const downloadChatAsPDF = () => {
    setShowPrintableChat(true);
  };

  const shareViaWhatsApp = () => {
    const lastModelMessage = [...messages].reverse().find(m => m.role === "model");
    const textToShare = lastModelMessage 
      ? `*Resposta da FOLH.IA (Assistente Ambiental)*:\n\n${lastModelMessage.content.slice(0, 400)}...\n\n_Para saber mais, acesse a plataforma FOLH.IA!_`
      : "Olá! Estou conversando com a FOLH.IA sobre a legislação ambiental da minha fazenda. É muito simples!";
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(url, "_blank");
  };

  const openEmailModal = () => {
    setShowEmailModal(true);
  };

  const sendEmailWithForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) {
      return;
    }

    setIsSendingEmail(true);

    const formattedConversation = messages
      .map(m => {
        const speaker = m.role === "user" ? "Produtor Rural" : "FOLH.IA (Assistente)";
        return `${speaker}:\n${m.content}`;
      })
      .join("\n\n-------------------\n\n");

    const subject = "Histórico de Orientação Ambiental - FOLH.IA";
    const body = `Olá!\n\nAqui está o histórico de orientação ambiental gerado pela plataforma FOLH.IA:\n\n${formattedConversation}\n\nEmitido em: ${new Date().toLocaleDateString()}\nPlataforma FOLH.IA.`;
    
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          subject,
          text: body,
        }),
      });

      const data = await response.json();
      setIsSendingEmail(false);
      setShowEmailModal(false);

      if (response.ok && data.success) {
        setEmailSuccessMessage("E-mail enviado com sucesso diretamente do servidor!");
        setTargetEmail("");
        setTimeout(() => setEmailSuccessMessage(""), 5000);
      } else {
        throw new Error(data.error || "Erro no envio do servidor.");
      }
    } catch (err: any) {
      console.error("Erro ao enviar e-mail:", err);
      setIsSendingEmail(false);
      alert(`Não foi possível enviar o e-mail diretamente: ${err.message || "tente novamente."}`);
    }
  };

  const sendEmailWithLocalClient = () => {
    if (!targetEmail.trim()) {
      alert("Por favor, digite um e-mail de destino.");
      return;
    }

    const formattedConversation = messages
      .map(m => {
        const speaker = m.role === "user" ? "Produtor Rural" : "FOLH.IA (Assistente)";
        return `${speaker}:\n${m.content}`;
      })
      .join("\n\n-------------------\n\n");

    const subject = "Histórico de Orientação Ambiental - FOLH.IA";
    const body = `Olá!\n\nAqui está o histórico de orientação ambiental gerado pela plataforma FOLH.IA:\n\n${formattedConversation}\n\nEmitido em: ${new Date().toLocaleDateString()}\nPlataforma FOLH.IA.`;
    
    const mailtoUrl = `mailto:${targetEmail.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoUrl, "_blank");
    setShowEmailModal(false);
    setEmailSuccessMessage("E-mail gerado! Abra o seu aplicativo de e-mail conectado.");
    setTimeout(() => setEmailSuccessMessage(""), 5000);
  };

  return (
    <div className={getWrapperClass()} id="producer-area-wrapper">
      
      {/* Floating Accessibility Toggle FAB with Accessibility Symbol */}
      <button
        onClick={() => {
          setShowAccessibilityPanel(!showAccessibilityPanel);
          setShowOptions(false);
        }}
        className={`absolute right-4 top-20 z-40 p-2.5 rounded-full shadow-lg border transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
          showAccessibilityPanel 
            ? "bg-dourado-suave text-verde-floresta border-dourado-suave font-bold" 
            : "bg-white text-verde-floresta border-bege-card hover:bg-bege-claro"
        }`}
        title="Controles de Acessibilidade"
        id="btn-accessibility-floating"
      >
        <Accessibility className="w-5 h-5 shrink-0 text-emerald-700" />
      </button>
      
      {/* Producer Chat Header */}
      <div className="bg-verde-floresta px-4 sm:px-6 py-4 flex items-center justify-between text-white border-b border-verde-natureza/30" id="producer-header">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-verde-natureza"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-verde-natureza flex items-center justify-center font-bold text-white shadow-inner shrink-0 text-sm sm:text-base">
            F
          </div>
          <div>
            <div className="font-display font-bold text-sm sm:text-base flex items-center gap-1 sm:gap-1.5">
              FOLH.IA <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-verde-natureza rounded-full inline-block animate-pulse"></span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-gray-300">Consultora Ambiental do Campo</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Refresh/Sync Chat Button */}
          <button
            onClick={handleRefreshChat}
            className="text-[10px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-1 cursor-pointer shrink-0"
            title="Atualizar Chat sem perder o histórico"
            id="btn-refresh-chat"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Atualizar Chat</span>
          </button>

          {/* Action Toggle for Discretely Accessing Options */}
          <div className="relative">
            <button
              onClick={() => {
                setShowOptions(!showOptions);
                setShowAccessibilityPanel(false);
              }}
              className="text-[10px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/10 flex items-center gap-1 cursor-pointer shrink-0"
              id="btn-options-dropdown"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              Opções
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-lg border border-bege-card py-2 z-30 text-gray-700"
                  id="discrete-menu"
                >
                  <div className="px-3 py-1 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-1">
                    Ações para a Conversa
                  </div>
                  <button
                    onClick={() => { shareViaWhatsApp(); setShowOptions(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-bege-claro flex items-center gap-2 cursor-pointer text-verde-floresta font-medium"
                  >
                    <Share2 className="w-4 h-4 text-green-500 shrink-0" />
                    Enviar no WhatsApp
                  </button>
                  <button
                    onClick={() => { downloadChatAsPDF(); setShowOptions(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-bege-claro flex items-center gap-2 cursor-pointer text-verde-floresta font-medium"
                  >
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    Salvar / Imprimir (PDF)
                  </button>
                  <button
                    onClick={() => { openEmailModal(); setShowOptions(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-bege-claro flex items-center gap-2 cursor-pointer text-verde-floresta font-medium"
                  >
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    Enviar por E-mail
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => { handleRefreshChat(); setShowOptions(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-bege-claro flex items-center gap-2 cursor-pointer text-verde-floresta font-medium"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                    Sincronizar Histórico
                  </button>
                  <button
                    onClick={() => { handleFileUploadClick(); setShowOptions(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-bege-claro flex items-center gap-2 cursor-pointer text-verde-floresta font-medium"
                  >
                    <Upload className="w-4 h-4 text-dourado-suave shrink-0" />
                    Enviar Papel / CAR
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Dynamic Accessibility Quick-adjust Toolbar */}
      <AnimatePresence>
        {showAccessibilityPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 sm:px-6 py-3 border-b border-bege-card/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-xs transition-all ${
              highContrast 
                ? "bg-black text-white border-white" 
                : "bg-bege-claro text-verde-floresta"
            }`}
            id="accessibility-control-panel"
          >
            {/* Font size adjustment */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] opacity-80 shrink-0">Tamanho da Letra:</span>
              <div className="flex bg-white/50 rounded-lg p-0.5 border border-bege-card/40 shadow-sm shrink-0">
                <button
                  onClick={() => setFontSize("normal")}
                  className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                    fontSize === "normal"
                      ? "bg-verde-floresta text-white"
                      : "text-verde-floresta hover:bg-white/50"
                  }`}
                >
                  Padrão
                </button>
                <button
                  onClick={() => setFontSize("large")}
                  className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                    fontSize === "large"
                      ? "bg-verde-floresta text-white"
                      : "text-verde-floresta hover:bg-white/50"
                  }`}
                >
                  Grande (A+)
                </button>
                <button
                  onClick={() => setFontSize("xl")}
                  className={`px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                    fontSize === "xl"
                      ? "bg-verde-floresta text-white"
                      : "text-verde-floresta hover:bg-white/50"
                  }`}
                >
                  Muito Grande (A++)
                </button>
              </div>
            </div>

            {/* Contrast adjustment */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] opacity-80">Visualização:</span>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`px-2.5 py-1 text-[10px] rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                  highContrast
                    ? "bg-white text-black border-white"
                    : "bg-white/70 text-verde-floresta border-bege-card hover:bg-white"
                }`}
              >
                <Eye className="w-3 h-3 shrink-0" />
                {highContrast ? "Contraste Normal" : "Alto Contraste"}
              </button>
            </div>

            {/* Voice Engine selection */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] opacity-80 shrink-0">Tipo de Voz:</span>
              <div className="flex bg-white/50 rounded-lg p-0.5 border border-bege-card/40 shadow-sm shrink-0">
                <button
                  onClick={() => setVoiceEngine("instant")}
                  className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    voiceEngine === "instant"
                      ? "bg-verde-floresta text-white"
                      : "text-verde-floresta hover:bg-white/50"
                  }`}
                  title="Utiliza a voz nativa imediata (sem delay e economiza dados móveis)"
                >
                  <Sparkles className="w-3 h-3 text-dourado-suave shrink-0" />
                  Instantânea (Rápida)
                </button>
                <button
                  onClick={() => setVoiceEngine("ia")}
                  className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                    voiceEngine === "ia"
                      ? "bg-verde-floresta text-white"
                      : "text-verde-floresta hover:bg-white/50"
                  }`}
                  title="Utiliza a voz humanizada da Inteligência Artificial"
                >
                  Voz IA
                </button>
              </div>
            </div>

            {/* Playback speed adjustment */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <span className="font-bold uppercase tracking-wider text-[9px] sm:text-[10px] opacity-80 shrink-0">Velocidade do Áudio:</span>
              <div className="flex bg-white/50 rounded-lg p-0.5 border border-bege-card/40 shadow-sm shrink-0">
                {[1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 sm:px-2 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                      playbackSpeed === speed
                        ? "bg-verde-floresta text-white font-black"
                        : "text-verde-floresta hover:bg-white/50"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Viewport */}
      <div 
        className={getChatViewportClass()}
        id="messages-viewport"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              id={`message-bubble-${msg.id}`}
            >
              <div 
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-sm relative ${
                  msg.role === "user" ? getUserBubbleClass() : getModelBubbleClass()
                }`}
              >
                {/* Embedded File Metadata if present */}
                {msg.file && (
                  <div className="mb-2 p-2 rounded bg-black/10 flex items-center gap-2 text-xs">
                    <File className="w-4 h-4 text-dourado-suave" />
                    <div className="truncate">
                      <p className="font-semibold truncate text-[11px] sm:text-xs">{msg.file.name}</p>
                      <p className="text-[9px] sm:text-[10px] opacity-75">{(msg.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                )}

                {/* Audio Text narration control for Model responses at the TOP */}
                {msg.role === "model" && (
                  <div className="pb-2 mb-2 border-b border-gray-100/30 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                    <span className="text-[10px] font-bold text-verde-floresta flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-dourado-suave" />
                      FOLH.IA
                    </span>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => listenToMessage(msg)}
                        disabled={loadingAudioId !== null && loadingAudioId !== msg.id}
                        className={`text-[10px] sm:text-xs flex items-center gap-1 py-1 px-2.5 rounded-full cursor-pointer transition-all shrink-0 ${
                          audioPlayingId === msg.id 
                            ? isAudioPaused 
                              ? "bg-verde-natureza/20 text-verde-floresta border border-verde-natureza/30"
                              : "bg-red-100 text-red-700 font-bold animate-pulse"
                            : "bg-verde-natureza/10 text-verde-floresta hover:bg-verde-natureza/20 border border-verde-natureza/25"
                        }`}
                        title={audioPlayingId === msg.id ? (isAudioPaused ? "Retomar áudio" : "Pausar áudio") : "Ouvir esta resposta"}
                      >
                        {loadingAudioId === msg.id ? (
                          <>
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-verde-floresta border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[9px] sm:text-[10px]">Buscando...</span>
                          </>
                        ) : audioPlayingId === msg.id ? (
                          isAudioPaused ? (
                            <>
                              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current text-verde-floresta" />
                              <span className="text-[9px] sm:text-[10px]">Retomar</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-700 fill-current" />
                              <span className="text-[9px] sm:text-[10px]">Pausar</span>
                            </>
                          )
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-verde-floresta" />
                            <span className="text-[9px] sm:text-[10px] font-bold">Ouvir Resposta</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body Text */}
                <div className={`${getFontSizeClass()} leading-relaxed whitespace-pre-line font-sans`}>
                  {renderMessageContent(msg.content)}
                </div>

                {msg.role === "model" && (
                  <div className="text-[9px] sm:text-[10px] text-gray-400 text-right mt-1.5 opacity-80">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {msg.role === "user" && (
                  <div className="text-[9px] sm:text-[10px] text-white/70 text-right mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming Loader / Thinking state */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex justify-start"
            id="thinking-loader"
          >
            <div className="bg-white rounded-2xl rounded-bl-none p-4 shadow-sm border border-bege-card flex items-center space-x-2">
              <span className="text-xs text-gray-500 font-medium animate-pulse">FOLH.IA está lendo a lei...</span>
              <div className="flex space-x-1">
                <div className="w-2.5 h-2.5 bg-verde-natureza rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2.5 h-2.5 bg-dourado-suave rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2.5 h-2.5 bg-verde-floresta rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* SIMULATED AUDIO RECORDING SCREEN overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-verde-floresta/95 text-white p-6 flex flex-col items-center justify-center space-y-6 text-center"
            id="recording-overlay"
          >
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Gravando sua pergunta...</h3>
              <p className="text-sm text-gray-300 mt-1">Fale naturalmente. Clique no botão abaixo para concluir.</p>
              <span className="font-mono text-2xl font-bold mt-4 block text-dourado-suave">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </div>

            {/* Simple audio wave visualization */}
            <div className="flex items-end justify-center space-x-1 h-12 w-full max-w-xs">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-verde-natureza rounded-full"
                  animate={{ height: [12, Math.random() * 40 + 12, 12] }}
                  transition={{ repeat: Infinity, duration: 0.6 + i * 0.05, ease: "easeInOut" }}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setIsRecording(false);
                // Simulate transcribing a question
                const simulatedQuestions = [
                  "Posso plantar perto do rio?",
                  "O meu CAR deu pendência, o que eu faço?",
                  "Quantos metros de mata eu preciso deixar na beira da minha nascente?",
                  "O que significa APP que o técnico me falou?",
                  "Tenho uma área desmatada e não sei o que fazer para regularizar."
                ];
                const randomQuestion = simulatedQuestions[Math.floor(Math.random() * simulatedQuestions.length)];
                setInputValue(randomQuestion);
              }}
              className="px-6 py-2.5 rounded-full bg-white text-verde-floresta font-bold text-sm cursor-pointer hover:bg-bege-claro transition-all shadow"
            >
              Concluir Gravação
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input controls panel */}
      <div className="p-4 border-t border-bege-card bg-white" id="producer-controls-panel">
        
        {/* Quick audio suggestions helper (Fale por mim) - highly intuitive for low literacy */}
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" id="voice-presets">
          <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Perguntas Rápidas:</span>
          <button 
            onClick={() => simulateVoiceMessage("Posso plantar perto do rio?")}
            className="text-xs bg-bege-claro hover:bg-bege-card px-3 py-1.5 rounded-full border border-bege-card text-verde-floresta whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
          >
            <Mic className="w-3 h-3 text-dourado-suave" />
            "Posso plantar perto do rio?"
          </button>
          <button 
            onClick={() => simulateVoiceMessage("O que é APP?")}
            className="text-xs bg-bege-claro hover:bg-bege-card px-3 py-1.5 rounded-full border border-bege-card text-verde-floresta whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
          >
            <Mic className="w-3 h-3 text-dourado-suave" />
            "O que é APP?"
          </button>
          <button 
            onClick={() => simulateVoiceMessage("Meu CAR deu problema.")}
            className="text-xs bg-bege-claro hover:bg-bege-card px-3 py-1.5 rounded-full border border-bege-card text-verde-floresta whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
          >
            <Mic className="w-3 h-3 text-dourado-suave" />
            "Meu CAR deu problema."
          </button>
          <button 
            onClick={() => simulateVoiceMessage("Tenho área desmatada, o que fazer?")}
            className="text-xs bg-bege-claro hover:bg-bege-card px-3 py-1.5 rounded-full border border-bege-card text-verde-floresta whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
          >
            <Mic className="w-3 h-3 text-dourado-suave" />
            "Área desmatada"
          </button>
        </div>

        {/* File Attachment Notification */}
        {attachedFile && (
          <div className="mb-3 p-2 bg-dourado-suave/10 border border-dourado-suave/20 rounded-xl flex items-center justify-between text-xs text-verde-floresta animate-fadeIn">
            <div className="flex items-center space-x-2 truncate">
              <File className="w-4 h-4 text-dourado-suave" />
              <span className="font-semibold truncate">{attachedFile.name}</span>
              <span className="text-[10px] text-gray-500">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button 
              onClick={removeAttachedFile}
              className="text-gray-400 hover:text-red-500 p-1"
              title="Remover documento"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success toast notification */}
        {emailSuccessMessage && (
          <div className="mb-2 p-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-center text-xs font-bold animate-pulse">
            {emailSuccessMessage}
          </div>
        )}

        <div className="flex items-end space-x-1.5 sm:space-x-2" id="input-container-row">
          
          {/* File attachment upload trigger */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden" 
          />
          <button
            onClick={handleFileUploadClick}
            className="p-2.5 sm:p-3 mb-1 bg-bege-claro hover:bg-bege-card rounded-2xl text-verde-floresta border border-bege-card transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Enviar papel ou CAR digitalizado"
          >
            <Upload className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-dourado-suave shrink-0" />
          </button>

          {/* Large, spacious text textarea area */}
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            rows={2}
            placeholder={attachedFile ? "Pergunte sobre o documento..." : "Escreva sua dúvida..."}
            className="flex-1 min-w-0 bg-bege-claro border border-bege-card focus:border-verde-natureza focus:outline-none rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm text-verde-floresta placeholder-gray-400 font-sans resize-none h-14"
            id="chat-text-input"
          />

          {/* Grab Audio button */}
          <button
            onClick={() => simulateVoiceMessage("Quero tirar uma dúvida")}
            disabled={isLoading}
            className="p-2.5 sm:p-3 mb-1 bg-dourado-suave/10 hover:bg-dourado-suave/20 border border-dourado-suave/30 text-dourado-suave rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Falar por áudio"
            id="btn-voice-record"
          >
            <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
          </button>

          {/* Submit Message button */}
          <button
            onClick={() => handleSend()}
            disabled={isLoading || (!inputValue.trim() && !attachedFile)}
            className="p-2.5 sm:p-3 mb-1 bg-verde-natureza hover:bg-verde-natureza/90 text-white rounded-2xl transition-all shadow flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
            id="btn-send-message"
          >
            <Send className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Email Input Modal Overlay */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="email-sender-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
            >
              <div className="bg-verde-floresta p-4 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-dourado-suave" />
                  <span className="font-display font-bold text-sm tracking-wide uppercase">Enviar Orientação por E-mail</span>
                </div>
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 hover:bg-white/15 text-white rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={sendEmailWithForm} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="target-email-input" className="block text-xs font-bold text-gray-500 uppercase">
                    E-mail de Destinatário
                  </label>
                  <input
                    type="email"
                    id="target-email-input"
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="exemplo@fazenda.com.br"
                    className="w-full bg-bege-claro/50 border border-bege-card focus:border-verde-natureza focus:outline-none rounded-xl px-4 py-3 text-sm text-verde-floresta placeholder-gray-400 font-sans"
                  />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    O histórico completo da conversa com as orientações estruturadas será enviado para o endereço informado.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="w-full px-4 py-2.5 bg-verde-natureza hover:bg-verde-natureza/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isSendingEmail ? "Processando..." : "Enviar Diretamente pelo Servidor"}
                  </button>
                  <button
                    type="button"
                    onClick={sendEmailWithLocalClient}
                    className="w-full px-4 py-2.5 bg-bege-claro hover:bg-bege-card text-verde-floresta text-xs font-bold rounded-xl border border-bege-card transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-dourado-suave" />
                    Abrir no meu Aplicativo de E-mail (Gmail/Outlook)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-100 transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Chat History Report View */}
      <AnimatePresence>
        {showPrintableChat && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 sm:p-6" id="printable-chat-modal">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 border border-gray-200 flex flex-col">
              
              {/* Modal Controls (Hidden during print) */}
              <div className="bg-gray-900 px-6 py-4 flex items-center justify-between text-white print:hidden">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-dourado-suave" />
                  <span className="font-display font-bold text-sm tracking-wide">PARECER DE ORIENTAÇÃO AMBIENTAL</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-verde-natureza hover:bg-verde-natureza/90 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer animate-bounce"
                  >
                    <FileText className="w-4 h-4" />
                    Imprimir / Salvar PDF
                  </button>
                  <button
                    onClick={() => setShowPrintableChat(false)}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Paper Content (A4 simulated paper) */}
              <div 
                className="bg-white p-8 sm:p-12 text-gray-900 font-serif leading-relaxed max-w-none print:p-0 print:m-0"
                id="printable-chat-sheet"
              >
                {/* Official Document Header */}
                <div className="border-b-4 border-double border-gray-400 pb-6 mb-8 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="font-display font-extrabold text-2xl tracking-widest text-green-900">FOLH.IA</span>
                  </div>
                  <h1 className="font-display font-bold text-xl uppercase tracking-wider text-gray-800 mb-1">
                    RELATÓRIO DE CONFORMIDADE E ORIENTAÇÃO AMBIENTAL
                  </h1>
                  <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                    SISTEMA INTELIGENTE DE APOIO À LEGISLAÇÃO AMBIENTAL BRASILEIRA
                  </p>
                </div>

                {/* Metadata Block */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans border border-gray-300 p-4 bg-gray-50/50 rounded-lg mb-8">
                  <div className="space-y-1">
                    <p><strong className="text-gray-700">DOCUMENTO:</strong> PARECER INFORMATIVO AUTOMÁTICO</p>
                    <p><strong className="text-gray-700">MODALIDADE:</strong> INTERATIVA - CANAL DO PRODUTOR</p>
                    <p><strong className="text-gray-700">BASE LEGAL PRINCIPAL:</strong> LEI 12.651 DE 2012 (CÓDIGO FLORESTAL)</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p><strong className="text-gray-700">DATA DE EMISSÃO:</strong> {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    <p><strong className="text-gray-700">PLATAFORMA:</strong> ASSISTENTE INTELIGENTE FOLH.IA</p>
                    <p><strong className="text-gray-700">ESTADO DO RELATÓRIO:</strong> <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-[10px]">CONCLUÍDO</span></p>
                  </div>
                </div>

                {/* Info Disclaimer */}
                <div className="text-xs text-justify italic text-gray-500 font-sans border-l-4 border-gray-300 pl-4 py-1 mb-8">
                  Este relatório organiza de forma estruturada as perguntas realizadas pelo produtor e as respostas preliminares elaboradas pela FOLH.IA com base nas regras do Código Florestal Brasileiro.
                </div>

                {/* Questions & Answers Section */}
                <div className="space-y-6">
                  <h3 className="font-display font-bold text-sm text-green-950 uppercase border-b border-gray-200 pb-2 mb-4">
                    Histórico de Perguntas e Respostas
                  </h3>
                  
                  {messages.map((msg, index) => (
                    <div key={msg.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm page-break-inside-avoid">
                      <div className={`px-4 py-2 text-xs font-sans font-bold flex justify-between items-center ${
                        msg.role === "user" 
                          ? "bg-green-50 text-green-950" 
                          : "bg-gray-50 text-gray-800 border-t border-gray-150"
                      }`}>
                        <span className="flex items-center gap-1.5 uppercase tracking-wide">
                          {msg.role === "user" ? "👤 Pergunta do Produtor" : "🍃 Resposta da FOLH.IA"}
                        </span>
                        <span className="text-[10px] font-normal text-gray-500">
                          Mensagem #{index + 1}
                        </span>
                      </div>
                      <div className="p-4 bg-white text-sm font-sans text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legal Signatures / Footer */}
                <div className="mt-16 pt-8 border-t border-gray-200 text-center font-sans text-xs text-gray-500">
                  <div className="max-w-xs mx-auto mb-4 border-b border-gray-400 pb-1">
                    <span className="font-bold text-gray-700">FOLH.IA SISTEMAS INTELIGENTES</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Mapeamento de Leis Ambientais Federais - CAR e Código Florestal Brasileiro<br />
                    Tecnologia Democratizando o Acesso e Regularização do Produtor Rural
                  </p>
                </div>
              </div>

              {/* Modal Bottom (Hidden during print) */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-100 print:hidden">
                <button
                  onClick={() => setShowPrintableChat(false)}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 transition-all cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
