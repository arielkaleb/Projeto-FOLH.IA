import React, { useState, useRef } from "react";
import { 
  Upload, FileText, CheckCircle, AlertTriangle, HelpCircle, 
  Send, RefreshCw, ChevronRight, FileCode, Printer, Download, Eye, X, BookOpen, Scale
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message, DocumentAnalysisReport } from "../types";

interface AnalystAreaProps {
  onBack: () => void;
  onPreviewReport: (reportContent: string) => void;
}

export default function AnalystArea({ onBack, onPreviewReport }: AnalystAreaProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "analyst-welcome",
      role: "model",
      content: "Bem-vindo ao canal do Analista Técnico FOLH.IA. Estou pronta para ajudá-lo na checagem avançada de conformidade, identificação de inconsistências no CAR e fundamentação legal de pareceres técnicos com base na Lei 12.651/2012 e Decreto 7.830/2012. Envie um documento para análise ou escreva sua consulta jurídica.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; mimeType: string; data: string; size: number } | null>(null);
  
  // Structured document analysis report state
  const [analysisReport, setAnalysisReport] = useState<DocumentAnalysisReport | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    const userMsg: Message = {
      id: `analyst-user-${Date.now()}`,
      role: "user",
      content: inputValue || `Enviado o arquivo ${selectedFile?.name} para parecer técnico completo.`,
      timestamp: new Date(),
      file: selectedFile ? {
        name: selectedFile.name,
        mimeType: selectedFile.mimeType,
        size: selectedFile.size
      } : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    const tempFile = selectedFile;
    // Keep file in dashboard context but clear from direct text chat input if sent
    setSelectedFile(null);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: userMsg.content }],
          file: tempFile ? {
            name: tempFile.name,
            mimeType: tempFile.mimeType,
            data: tempFile.data
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Erro de resposta do servidor de IA.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) {
        throw new Error("Leitor de fluxo não disponível.");
      }

      const modelMsgId = `analyst-model-${Date.now()}`;
      const modelMsg: Message = {
        id: modelMsgId,
        role: "model",
        content: "",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, modelMsg]);
      setTimeout(scrollToBottom, 50);

      // Turn off loading spinner as soon as the first packet is arriving/processed
      setIsLoading(false);

      let accumulatedText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        setMessages((prev) => 
          prev.map((m) => m.id === modelMsgId ? { ...m, content: accumulatedText } : m)
        );
        setTimeout(scrollToBottom, 50);
      }

      // If a file was analyzed, try to extract a structured summary from modelMsg
      if (tempFile) {
        parseStructuredReport(accumulatedText, tempFile.name);
      }

    } catch (err: any) {
      console.error("Falha no chat do analista:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "model",
          content: "Não foi possível obter a resposta da IA. Verifique as credenciais de API do Gemini nos segredos do seu servidor.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parses unstructured AI response to populate a gorgeous technical KPI dashboard on the left
  const parseStructuredReport = (text: string, filename: string) => {
    // We can run a heuristics parsing or let the AI do it
    // To make it extremely reliable and instant, we parse typical sections of our prompt structure
    const hasInconsistencies = text.toLowerCase().includes("inconsistência") || text.toLowerCase().includes("divergência") || text.toLowerCase().includes("irregularidade");
    
    // Heuristic analysis score
    let score = 100;
    const inconsistencies: string[] = [];
    
    if (text.toLowerCase().includes("reserva legal") && (text.toLowerCase().includes("abaixo") || text.toLowerCase().includes("insuficiente") || text.toLowerCase().includes("irregular"))) {
      score -= 30;
      inconsistencies.push("Reserva Legal abaixo do mínimo legal exigido para o bioma.");
    }
    if (text.toLowerCase().includes("app") && (text.toLowerCase().includes("invadida") || text.toLowerCase().includes("supressão") || text.toLowerCase().includes("descumpre"))) {
      score -= 30;
      inconsistencies.push("Inconformidade em Área de Preservação Permanente (APP) fluvial/nascente.");
    }
    if (text.toLowerCase().includes("sobreposição") || text.toLowerCase().includes("conflito")) {
      score -= 20;
      inconsistencies.push("Indícios de sobreposição de área declarada com assentamentos ou terras protegidas.");
    }

    if (inconsistencies.length === 0) {
      if (hasInconsistencies) {
        score = 75;
        inconsistencies.push("Identificados pontos de atenção secundários na documentação do CAR.");
      } else {
        score = 100;
      }
    }

    setAnalysisReport({
      fileName: filename,
      analyzedAt: new Date(),
      summary: text.slice(0, 300) + "...",
      conformityScore: score,
      inconsistencies: inconsistencies.length > 0 ? inconsistencies : ["Nenhuma inconsistência grave identificada nas regras primárias do CAR."],
      recommendations: [
        "Adesão imediata ao Programa de Regularização Ambiental (PRA) se aplicável.",
        "Acompanhar homologação final do CAR no órgão ambiental estadual competente.",
        "Manter isolamento das áreas de APP para regeneração espontânea de vegetação nativa."
      ],
      technicalOpinion: text
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingDoc(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: reader.result as string
      };

      setSelectedFile(fileData);
      setIsAnalyzingDoc(false);

      // Instantly start analysis in background
      // Set a small placeholder message
      setInputValue(`Por favor, analise as inconformidades e me dê um parecer preliminar do documento ${file.name}.`);
    };
    reader.onerror = () => {
      alert("Erro ao carregar documento.");
      setIsAnalyzingDoc(false);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[85vh]" id="analyst-dashboard">
      
      {/* Left panel: Document analysis reports and KPIs */}
      <div className="lg:col-span-5 flex flex-col space-y-6" id="analyst-left-pane">
        
        {/* Upload card */}
        <div className="bg-white rounded-3xl p-6 border border-bege-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-verde-floresta flex items-center gap-2">
                <Upload className="w-5 h-5 text-dourado-suave" />
                Análise Documental do CAR
              </h3>
              <button 
                onClick={onBack}
                className="text-xs text-gray-500 hover:text-verde-natureza transition-colors cursor-pointer"
              >
                Voltar ao Início
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Arraste ou selecione documentos do Cadastro Ambiental Rural (CAR), PDFs de retificação, multas ou imagens escaneadas para extrair inconformidades legais.
            </p>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden" 
            />

            <div 
              onClick={triggerFileInput}
              className="border-2 border-dashed border-bege-card hover:border-verde-natureza rounded-2xl p-8 text-center cursor-pointer bg-bege-claro/30 hover:bg-white transition-all group"
            >
              <FileCode className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-verde-natureza transition-colors" />
              <span className="block text-xs font-bold text-verde-floresta mb-1">
                SELECIONAR ARQUIVO (PDF ou Imagem)
              </span>
              <span className="text-[10px] text-gray-400">
                Tamanho máximo recomendado: 10MB
              </span>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-4 p-3 bg-dourado-suave/5 border border-dourado-suave/20 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-dourado-suave" />
                <span className="font-semibold text-verde-floresta truncate">{selectedFile.name}</span>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-red-500 p-1"
                title="Remover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isAnalyzingDoc && (
            <div className="mt-4 flex items-center justify-center py-2 space-x-2">
              <RefreshCw className="w-4 h-4 text-verde-natureza animate-spin" />
              <span className="text-xs text-gray-500">Lendo arquivos...</span>
            </div>
          )}
        </div>

        {/* Structured opinion & KPI section */}
        {analysisReport ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 border border-bege-card shadow-sm flex-1 flex flex-col justify-between space-y-6"
            id="structured-report-card"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h4 className="font-display font-bold text-sm text-verde-floresta truncate max-w-[200px]">
                    {analysisReport.fileName}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    Análise em {analysisReport.analyzedAt.toLocaleDateString()}
                  </span>
                </div>

                {/* Score gauge */}
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase">Índice Conformidade</span>
                    <span className={`text-lg font-bold ${analysisReport.conformityScore >= 80 ? "text-green-600" : analysisReport.conformityScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {analysisReport.conformityScore}%
                    </span>
                  </div>
                  <div className={`w-3 h-10 rounded-full bg-gray-100 relative overflow-hidden`}>
                    <div 
                      className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ${
                        analysisReport.conformityScore >= 80 
                          ? "bg-green-500" 
                          : analysisReport.conformityScore >= 50 
                            ? "bg-yellow-500" 
                            : "bg-red-500"
                      }`} 
                      style={{ height: `${analysisReport.conformityScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Inconsistencies detected list */}
              <div className="mt-5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Inconsistências Identificadas</span>
                <div className="space-y-2">
                  {analysisReport.inconsistencies.map((inc, index) => (
                    <div key={index} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Orientações de Regularização</span>
                <ul className="space-y-1.5">
                  {analysisReport.recommendations.map((rec, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-verde-natureza shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Print and view buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => onPreviewReport(analysisReport.technicalOpinion)}
                className="px-4 py-2 bg-verde-floresta text-white font-semibold text-xs rounded-xl hover:bg-verde-floresta/95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Ver Parecer Preliminar Completo em tela cheia para impressão"
              >
                <Eye className="w-4 h-4" />
                Visualizar Parecer
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white text-verde-floresta font-semibold text-xs rounded-xl border border-bege-card hover:bg-bege-claro transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Imprimir laudo completo"
              >
                <Printer className="w-4 h-4 text-dourado-suave" />
                Imprimir Laudo
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-bege-card shadow-sm flex-1 flex flex-col justify-center items-center text-center text-gray-400 p-8">
            <BookOpen className="w-12 h-12 text-bege-card mb-3" />
            <span className="text-xs font-semibold text-gray-500">Nenhum laudo estruturado ativo</span>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-normal">
              Anexe um arquivo de CAR ou faça perguntas para gerar análises estatísticas automáticas de inconsistência e conformidade aqui.
            </p>
          </div>
        )}
      </div>

      {/* Right panel: Active chat simulation for Analysts */}
      <div className="lg:col-span-7 flex flex-col bg-white rounded-3xl shadow-sm border border-bege-card overflow-hidden" id="analyst-right-pane">
        
        {/* Analyst Chat Header */}
        <div className="bg-verde-floresta px-6 py-4 flex items-center justify-between text-white border-b border-verde-natureza/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-dourado-suave/20 flex items-center justify-center border border-dourado-suave/40">
              <Scale className="w-5 h-5 text-dourado-suave" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Painel de Formulação de Parecer</h3>
              <p className="text-[10px] text-gray-300">Inteligência Ambiental Fundamentada em Lei</p>
            </div>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full border border-white/20 text-dourado-suave font-bold">
            GEMINI 3.5
          </span>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-bege-claro/20 min-h-[400px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[90%] rounded-2xl p-4 shadow-sm relative ${
                  msg.role === "user" 
                    ? "bg-verde-floresta text-white rounded-br-none text-sm" 
                    : "bg-white text-gray-800 border border-bege-card rounded-bl-none text-xs leading-relaxed"
                }`}
              >
                {msg.file && (
                  <div className="mb-2 p-2 rounded bg-black/10 flex items-center gap-1.5 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-dourado-suave" />
                    <span className="truncate max-w-[150px]">{msg.file.name}</span>
                  </div>
                )}
                
                <div className="whitespace-pre-line font-sans">
                  {msg.content}
                </div>

                <div className="mt-2 text-[9px] text-gray-400 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-bege-card flex items-center space-x-2">
                <span className="text-xs text-gray-400 animate-pulse">Processando parecer técnico...</span>
                <div className="w-1.5 h-1.5 bg-verde-natureza rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action Suggestion box */}
        <div className="bg-bege-claro/50 px-4 py-2 border-t border-bege-card flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">Exemplos Técnicos:</span>
          <button
            onClick={() => setInputValue("Quais as regras de APP para rios de até 10 metros de largura no Código Florestal?")}
            className="text-[11px] bg-white border border-bege-card px-2.5 py-1 rounded-full text-verde-floresta font-semibold whitespace-nowrap cursor-pointer hover:bg-bege-claro transition-colors"
          >
            "Largura de APP para rios"
          </button>
          <button
            onClick={() => setInputValue("Como funciona a recomposição de Reserva Legal por meio de compensação em outra propriedade?")}
            className="text-[11px] bg-white border border-bege-card px-2.5 py-1 rounded-full text-verde-floresta font-semibold whitespace-nowrap cursor-pointer hover:bg-bege-claro transition-colors"
          >
            "Compensação de Reserva Legal"
          </button>
          <button
            onClick={() => setInputValue("Quais os requisitos do Decreto 7.830 para regularização através de Programa de Regularização Ambiental (PRA)?")}
            className="text-[11px] bg-white border border-bege-card px-2.5 py-1 rounded-full text-verde-floresta font-semibold whitespace-nowrap cursor-pointer hover:bg-bege-claro transition-colors"
          >
            "Decreto 7830 / PRA"
          </button>
        </div>

        {/* Input Panel */}
        <div className="p-4 border-t border-bege-card bg-white flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            disabled={isLoading}
            placeholder="Consulte dúvidas técnicas ou solicite análise detalhada..."
            className="flex-1 bg-bege-claro border border-bege-card focus:border-verde-natureza focus:outline-none rounded-2xl px-4 py-3 text-sm text-verde-floresta placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="p-3 bg-verde-floresta hover:bg-verde-floresta/90 text-white rounded-2xl transition-all shadow shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
