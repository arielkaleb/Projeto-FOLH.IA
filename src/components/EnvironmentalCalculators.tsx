import React, { useState } from "react";
import { 
  Calculator, ArrowLeft, Leaf, ShieldAlert, CheckCircle2, AlertTriangle, 
  HelpCircle, Waves, Trees, Compass, FileText, Sparkles, RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EnvironmentalCalculatorsProps {
  onBack: () => void;
  initialData?: {
    totalArea?: number;
    region?: string;
    preservedArea?: number;
  };
}

export default function EnvironmentalCalculators({ onBack, initialData }: EnvironmentalCalculatorsProps) {
  const [activeTab, setActiveTab] = useState<"rl" | "app" | "passivo">("rl");

  // Shared state for all calculators to ensure smooth, synchronized experience
  const [totalArea, setTotalArea] = useState<number | "">(initialData?.totalArea || "");
  const [preservedArea, setPreservedArea] = useState<number | "">(initialData?.preservedArea || "");
  const [region, setRegion] = useState<string>(initialData?.region || "outros"); // "amazonia" | "cerrado" | "outros"

  // APP State
  const [riverType, setRiverType] = useState<string>("10"); // "10" | "50" | "200" | "above"
  const [riverLength, setRiverLength] = useState<number | "">("");
  const [nascentesCount, setNascentesCount] = useState<number | "">("");

  // Passivo State
  const [usedArea, setUsedArea] = useState<number | "">("");

  // Clean form resets
  const handleReset = () => {
    setTotalArea("");
    setPreservedArea("");
    setRegion("outros");
    setRiverType("10");
    setRiverLength("");
    setNascentesCount("");
    setUsedArea("");
  };

  // Calculations:
  
  // 1. Reserva Legal
  const getRLPercentage = () => {
    if (region === "amazonia") return 80;
    if (region === "cerrado") return 35;
    return 20;
  };

  const rlPercentage = getRLPercentage();
  const calculatedRLRequired = totalArea !== "" ? (Number(totalArea) * rlPercentage) / 100 : 0;
  const rlPreserved = preservedArea !== "" ? Number(preservedArea) : 0;
  const rlDifference = rlPreserved - calculatedRLRequired;

  const getRLStatus = () => {
    if (totalArea === "") return { label: "Aguardando Dados", emoji: "⚪", color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200" };
    if (rlDifference >= 0) {
      return { 
        label: "Regularizado (Suficiente)", 
        emoji: "🟢", 
        color: "text-green-600", 
        bg: "bg-green-50/70", 
        border: "border-green-200",
        desc: "Sua propriedade atende ao percentual exigido pelo Código Florestal."
      };
    } else if (rlPreserved > 0) {
      return { 
        label: "Atenção (Déficit Parcial)", 
        emoji: "🟡", 
        color: "text-amber-600", 
        bg: "bg-amber-50/70", 
        border: "border-amber-200",
        desc: "Você possui vegetação preservada, mas está abaixo do mínimo obrigatório."
      };
    } else {
      return { 
        label: "Irregular (Déficit Total)", 
        emoji: "🔴", 
        color: "text-red-600", 
        bg: "bg-red-50/70", 
        border: "border-red-200",
        desc: "Nenhuma área de preservação declarada ou informada para Reserva Legal."
      };
    }
  };

  const rlStatus = getRLStatus();

  // 2. APP (Área de Preservação Permanente)
  const getRiverWidth = () => {
    if (riverType === "10") return 30;
    if (riverType === "50") return 50;
    if (riverType === "200") return 100;
    return 200;
  };

  const riverStripWidth = getRiverWidth();
  const calculatedRiverAppAreaM2 = riverLength !== "" ? Number(riverLength) * riverStripWidth * 2 : 0; // Both banks
  const calculatedRiverAppAreaHa = calculatedRiverAppAreaM2 / 10000;

  const nascenteAppAreaM2 = 7854; // Pi * r^2 (raio de 50m) = 3.14159 * 2500 = 7854m²
  const calculatedNascenteAppAreaHa = nascentesCount !== "" ? (Number(nascentesCount) * nascenteAppAreaM2) / 10000 : 0;

  const totalAppAreaHa = calculatedRiverAppAreaHa + calculatedNascenteAppAreaHa;

  // 3. Passivo Ambiental
  // Auto vegetation estimate if not entered in RL
  const estimatedVegetation = preservedArea !== "" 
    ? Number(preservedArea) 
    : (totalArea !== "" && usedArea !== "" ? Math.max(0, Number(totalArea) - Number(usedArea)) : 0);

  const totalEnvironmentalObligations = calculatedRLRequired + totalAppAreaHa;
  const environmentalDeficit = Math.max(0, totalEnvironmentalObligations - estimatedVegetation);
  const regularizedArea = Math.max(0, estimatedVegetation);

  const getPassivoStatus = () => {
    if (totalArea === "") return { label: "Aguardando Dados", emoji: "⚪", color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200" };
    if (environmentalDeficit === 0) {
      return { 
        label: "Regularizado", 
        emoji: "🟢", 
        color: "text-green-600", 
        bg: "bg-green-50/70", 
        border: "border-green-200",
        desc: "Excelente! A vegetação nativa existente cobre todas as obrigações de APP e Reserva Legal."
      };
    } else if (estimatedVegetation > 0) {
      return { 
        label: "Atenção (Passivo Existente)", 
        emoji: "🟡", 
        color: "text-amber-600", 
        bg: "bg-amber-50/70", 
        border: "border-amber-200",
        desc: "Você possui passivos ambientais a regularizar, mas já conta com vegetação existente."
      };
    } else {
      return { 
        label: "Irregular (Alto Risco)", 
        emoji: "🔴", 
        color: "text-red-600", 
        bg: "bg-red-50/70", 
        border: "border-red-200",
        desc: "Sem área preservada declarada. É obrigatório adotar medidas de restauração florestal."
      };
    }
  };

  const passivoStatus = getPassivoStatus();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" id="environmental-calculators-root">
      
      {/* Title Header with elegant back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-bege-card shadow-sm" id="calc-header-panel">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-verde-floresta flex items-center justify-center text-white shadow-inner">
            <Calculator className="w-6 h-6 text-verde-natureza" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-verde-floresta tracking-tight">
              Calculadoras Ambientais
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Simulações instantâneas de obrigações da Lei 12.651/2012 (Código Florestal)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-bege-card hover:bg-bege-claro/40 rounded-xl text-xs font-bold text-verde-floresta transition-all cursor-pointer"
            id="calc-btn-reset"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpar Dados
          </button>
          
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-verde-floresta hover:bg-verde-natureza text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            id="calc-btn-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Início
          </button>
        </div>
      </div>

      {/* Synchronized Information Bar */}
      {totalArea !== "" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-verde-natureza/10 border border-verde-natureza/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
          id="calc-shared-info-bar"
        >
          <div className="flex items-center space-x-2 text-verde-floresta font-semibold">
            <Leaf className="w-4 h-4 text-verde-natureza" />
            <span>Dados Atuais do Imóvel:</span>
            <span className="bg-white px-2 py-0.5 rounded-lg border border-bege-card">Área Total: {totalArea} ha</span>
            {preservedArea !== "" && (
              <span className="bg-white px-2 py-0.5 rounded-lg border border-bege-card">Vegetação Preservada: {preservedArea} ha</span>
            )}
            <span className="bg-white px-2 py-0.5 rounded-lg border border-bege-card uppercase">Bioma: {region === "amazonia" ? "Amazônia" : region === "cerrado" ? "Cerrado Amazônico" : "Geral / Outros"}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-semibold font-mono bg-white/70 px-2 py-1 rounded-lg">
            Sincronizado entre as abas
          </div>
        </motion.div>
      )}

      {/* Module Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-bege-card shadow-sm flex flex-col sm:flex-row gap-1.5" id="calc-tabs-navigation">
        <button
          onClick={() => setActiveTab("rl")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "rl"
              ? "bg-verde-floresta text-white shadow-md"
              : "text-verde-floresta hover:bg-bege-claro/50"
          }`}
          id="calc-tab-rl"
        >
          <Trees className="w-4 h-4" />
          🌱 Reserva Legal (RL)
        </button>

        <button
          onClick={() => setActiveTab("app")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "app"
              ? "bg-verde-floresta text-white shadow-md"
              : "text-verde-floresta hover:bg-bege-claro/50"
          }`}
          id="calc-tab-app"
        >
          <Waves className="w-4 h-4" />
          🌳 Preservação Permanente (APP)
        </button>

        <button
          onClick={() => setActiveTab("passivo")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "passivo"
              ? "bg-verde-floresta text-white shadow-md"
              : "text-verde-floresta hover:bg-bege-claro/50"
          }`}
          id="calc-tab-passivo"
        >
          <ShieldAlert className="w-4 h-4" />
          🌾 Passivo Ambiental
        </button>
      </div>

      {/* Active Tab Screen */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl border border-bege-card p-6 sm:p-8 shadow-sm space-y-8"
        >
          
          {/* TAB 1: RESERVA LEGAL */}
          {activeTab === "rl" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calc-screen-rl">
              
              {/* Form Input Side */}
              <div className="lg:col-span-5 space-y-5">
                <div className="border-b border-bege-card pb-3">
                  <h2 className="font-display font-bold text-base text-verde-floresta">
                    Simulação de Reserva Legal (RL)
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Art. 12 da Lei 12.651/2012
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Input 1: Localização/Bioma */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Localização do Imóvel / Bioma
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all cursor-pointer"
                      id="rl-input-region"
                    >
                      <option value="amazonia">Amazônia Legal (Florestas) - 80%</option>
                      <option value="cerrado">Cerrado na Amazônia Legal - 35%</option>
                      <option value="outros">Demais Regiões (Mata Atlântica, Pampa, etc) - 20%</option>
                    </select>
                  </div>

                  {/* Input 2: Área total */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Área Total do Imóvel (Hectares)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 150"
                        value={totalArea}
                        onChange={(e) => setTotalArea(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                        id="rl-input-total-area"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">ha</span>
                    </div>
                  </div>

                  {/* Input 3: Vegetação nativa preservada (Opcional) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Área já preservada de Vegetação Nativa (Opcional - ha)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 40"
                        value={preservedArea}
                        onChange={(e) => setPreservedArea(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                        id="rl-input-preserved"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">ha</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>O que é a Reserva Legal?</span>
                  </div>
                  É uma área localizada no interior da propriedade rural, com a função de assegurar o uso econômico sustentável dos recursos naturais e auxiliar a conservação da biodiversidade.
                </div>
              </div>

              {/* Output Result Side */}
              <div className="lg:col-span-7 space-y-6">
                {totalArea === "" ? (
                  <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-bege-card rounded-3xl bg-bege-claro/10">
                    <Trees className="w-10 h-10 text-gray-300 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-verde-floresta mb-1">Informe a Área Total</h3>
                    <p className="text-xs text-gray-400 max-w-xs font-medium">
                      Preencha os dados do imóvel no painel esquerdo para obter o relatório completo de adequação de Reserva Legal.
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Status Badge */}
                    <div className={`p-4 rounded-3xl border ${rlStatus.border} ${rlStatus.bg} flex items-center justify-between`}>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status da Propriedade</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{rlStatus.emoji}</span>
                          <span className={`text-base font-bold ${rlStatus.color}`}>{rlStatus.label}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-bege-card">
                        Exigência: {rlPercentage}%
                      </span>
                    </div>

                    {/* Numerical summary cards */}
                    <div className="grid grid-cols-3 gap-3.5">
                      <div className="bg-bege-claro/30 p-3.5 rounded-2xl border border-bege-card/60 text-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Área Obrigatória</span>
                        <span className="text-base sm:text-lg font-black text-verde-floresta">{calculatedRLRequired.toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400 font-bold block">hectares</span>
                      </div>
                      <div className="bg-bege-claro/30 p-3.5 rounded-2xl border border-bege-card/60 text-center">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Área Declarada</span>
                        <span className="text-base sm:text-lg font-black text-verde-natureza">{rlPreserved.toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400 font-bold block">hectares</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl text-center border ${rlDifference >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-1">{rlDifference >= 0 ? "Excesso (Sobra)" : "Déficit Real"}</span>
                        <span className="text-base sm:text-lg font-black">{Math.abs(rlDifference).toFixed(2)}</span>
                        <span className="text-[10px] font-bold block">hectares</span>
                      </div>
                    </div>

                    {/* Consultant Advisory text */}
                    <div className="bg-white border border-bege-card rounded-3xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-verde-natureza/5 rounded-bl-full pointer-events-none"></div>
                      <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-dourado-suave shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-verde-floresta uppercase tracking-wider">Parecer do Consultor FOLH.IA:</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Conforme o Código Florestal (Art. 12), para um imóvel de <strong>{totalArea} hectares</strong> situado em <strong>{region === "amazonia" ? "região de Florestas da Amazônia Legal" : region === "cerrado" ? "Cerrado dentro da Amazônia Legal" : "demais regiões brasileiras"}</strong>, você precisa manter ou restaurar no mínimo <strong>{calculatedRLRequired.toFixed(2)} hectares</strong> de vegetação nativa dentro da sua propriedade.
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            {rlDifference >= 0 ? (
                              <span>🎉 <strong>Sua propriedade está em conformidade legal!</strong> Você possui uma sobra de {rlDifference.toFixed(2)} hectares preservados acima da cota obrigatória. Essa vegetação excedente pode ser utilizada para compensação ambiental de outros imóveis rurais (através de Cotas de Reserva Ambiental - CRA).</span>
                            ) : (
                              <span>⚠️ <strong>Atenção: Existe um passivo ambiental de {Math.abs(rlDifference).toFixed(2)} hectares de Reserva Legal.</strong> Você precisará restaurar essa área ou compensá-la adquirindo cotas de outra área em conformidade no mesmo bioma para evitar autuações e restrições de crédito agrícola.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Card */}
                    <div className="bg-verde-floresta p-4.5 rounded-2xl text-white text-xs leading-relaxed">
                      <h4 className="font-bold text-verde-natureza uppercase tracking-wider mb-1.5">Recomendação Prática:</h4>
                      <ul className="list-disc pl-4 space-y-1 font-medium text-[11px] text-white/90">
                        <li>Certifique-se de registrar corretamente esses limites na plataforma do CAR estadual.</li>
                        {rlDifference < 0 && (
                          <>
                            <li>Considere aderir ao <strong>PRA (Programa de Regularização Ambiental)</strong> do seu estado para obter prazos e isenções de multas.</li>
                            <li>A regeneração natural assistida ou o plantio consorciado com espécies nativas são excelentes formas de zerar esse déficit.</li>
                          </>
                        )}
                        <li>A vegetação de Reserva Legal pode ser explorada economicamente de forma sustentável sob manejo previamente aprovado.</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ÁREA DE PRESERVAÇÃO PERMANENTE (APP) */}
          {activeTab === "app" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calc-screen-app">
              
              {/* Form Input Side */}
              <div className="lg:col-span-5 space-y-5">
                <div className="border-b border-bege-card pb-3">
                  <h2 className="font-display font-bold text-base text-verde-floresta">
                    Simulação de APP (Área de Preservação)
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Art. 4 da Lei 12.651/2012
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Input 1: Tipo / Largura do Rio */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Largura do Curso d'Água (Rio/Córrego)
                    </label>
                    <select
                      value={riverType}
                      onChange={(e) => setRiverType(e.target.value)}
                      className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all cursor-pointer"
                      id="app-input-river-type"
                    >
                      <option value="10">Menos de 10 metros de largura (Proteger 30m nas margens)</option>
                      <option value="50">Entre 10 e 50 metros de largura (Proteger 50m nas margens)</option>
                      <option value="200">Entre 50 e 200 metros de largura (Proteger 100m nas margens)</option>
                      <option value="above">Acima de 200 metros de largura (Proteger 200m nas margens)</option>
                    </select>
                  </div>

                  {/* Input 2: Comprimento do rio dentro da propriedade */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Extensão do Rio dentro da propriedade (Metros lineares)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 800"
                        value={riverLength}
                        onChange={(e) => setRiverLength(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                        id="app-input-river-length"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase font-mono">metros</span>
                    </div>
                  </div>

                  {/* Input 3: Número de Nascentes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Número de Nascentes de Água (Olhos d'água)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 2"
                        value={nascentesCount}
                        onChange={(e) => setNascentesCount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                        id="app-input-nascentes"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">unid</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>O que é APP?</span>
                  </div>
                  Área de Preservação Permanente (APP) é uma área protegida, coberta ou não por vegetação nativa, com a função ambiental de preservar os recursos hídricos, a paisagem, a estabilidade geológica e a biodiversidade.
                </div>
              </div>

              {/* Output Result Side */}
              <div className="lg:col-span-7 space-y-6">
                {riverLength === "" && nascentesCount === "" ? (
                  <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-bege-card rounded-3xl bg-bege-claro/10">
                    <Waves className="w-10 h-10 text-gray-300 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-verde-floresta mb-1">Calcule sua APP</h3>
                    <p className="text-xs text-gray-400 max-w-xs font-medium">
                      Insira o comprimento do rio ou a quantidade de nascentes no seu imóvel para obter os hectares obrigatórios de proteção.
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* APP Banner Status */}
                    <div className="p-4 rounded-3xl border border-blue-200 bg-blue-50/70 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Proteção Obrigatória</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">🌊</span>
                          <span className="text-base font-bold text-blue-900">APP Estimada</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-blue-200 text-blue-700">
                        Total: {totalAppAreaHa.toFixed(3)} ha
                      </span>
                    </div>

                    {/* Breakdown details */}
                    <div className="bg-bege-claro/20 p-5 rounded-2xl border border-bege-card space-y-3 text-xs">
                      <h3 className="font-bold text-verde-floresta uppercase tracking-wider text-[10px]">Detalhamento Técnico da APP:</h3>
                      
                      {riverLength !== "" && Number(riverLength) > 0 && (
                        <div className="flex justify-between items-center border-b border-bege-card/50 pb-2">
                          <div>
                            <p className="font-bold text-gray-700">APP de Rio ({riverLength}m extensão):</p>
                            <p className="text-[10px] text-gray-500 font-medium">Faixa de {riverStripWidth}m em ambas as margens</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-verde-floresta">{calculatedRiverAppAreaHa.toFixed(3)} ha</span>
                            <p className="text-[9px] text-gray-400 font-mono">({calculatedRiverAppAreaM2.toLocaleString()} m²)</p>
                          </div>
                        </div>
                      )}

                      {nascentesCount !== "" && Number(nascentesCount) > 0 && (
                        <div className="flex justify-between items-center pt-1">
                          <div>
                            <p className="font-bold text-gray-700">APP de Nascentes ({nascentesCount} unid):</p>
                            <p className="text-[10px] text-gray-500 font-medium">Raio de 50 metros ao redor de cada olho d'água</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-verde-floresta">{calculatedNascenteAppAreaHa.toFixed(3)} ha</span>
                            <p className="text-[9px] text-gray-400 font-mono">({(Number(nascentesCount) * nascenteAppAreaM2).toLocaleString()} m²)</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simple impact explanation */}
                    <div className="bg-white border border-bege-card rounded-3xl p-5 shadow-xs relative">
                      <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-dourado-suave shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-verde-floresta uppercase tracking-wider">Explicação do Impacto Ambiental:</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Seus dados indicam que o imóvel possui um passivo obrigatório de <strong>{totalAppAreaHa.toFixed(3)} hectares</strong> de Área de Preservação Permanente (APP). 
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            A conservação dessa vegetação de transição ciliar (ripária) impede o assoreamento do leito do rio, melhora a qualidade da água disponível para consumo e pecuária, e evita processos erosivos que causam a perda irreversível de solo agricultável.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations and Next Steps */}
                    <div className="bg-verde-floresta p-4.5 rounded-2xl text-white text-xs leading-relaxed">
                      <h4 className="font-bold text-verde-natureza uppercase tracking-wider mb-1.5">O que fazer agora:</h4>
                      <ul className="list-disc pl-4 space-y-1 font-medium text-[11px] text-white/90">
                        <li>Diferente da Reserva Legal, as APPs <strong>não podem ser compensadas</strong> em outra propriedade. Elas devem ser protegidas ou restauradas no próprio local físico.</li>
                        <li>Isente essas áreas do cálculo de Imposto Territorial Rural (ITR) informando-as no ADA (Ato de Declaração Ambiental).</li>
                        <li>Se houver degradação nas margens ou nascente, faça o cercamento imediato para impedir o pisoteio de gado e permitir a regeneração natural.</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PASSIVO AMBIENTAL */}
          {activeTab === "passivo" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calc-screen-passivo">
              
              {/* Form Input Side */}
              <div className="lg:col-span-5 space-y-5">
                <div className="border-b border-bege-card pb-3">
                  <h2 className="font-display font-bold text-base text-verde-floresta">
                    Cálculo de Passivo Ambiental Geral
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Diagnóstico consolidado de obrigações ambientais
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Input 1: Área Total */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Área Total do Imóvel (ha)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalArea}
                      onChange={(e) => setTotalArea(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Recuperada automaticamente"
                      className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                      id="passivo-input-total-area"
                    />
                  </div>

                  {/* Input 2: Área Consolidada / Utilizada (Lavoura/Pasto) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-verde-floresta uppercase tracking-wider block">
                      Área Utilizada para Lavoura ou Pasto (ha)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={usedArea}
                        onChange={(e) => setUsedArea(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Ex: 80"
                        className="w-full bg-bege-claro/40 border border-bege-card focus:border-verde-natureza rounded-xl py-3 px-3.5 text-xs font-semibold outline-none transition-all"
                        id="passivo-input-used"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">ha</span>
                    </div>
                  </div>

                  {/* Shared Info Reminder */}
                  <div className="p-3 bg-bege-claro/30 rounded-xl border border-bege-card text-[10px] text-gray-500 font-medium space-y-1.5">
                    <p className="font-bold text-verde-floresta text-[11px]">Dica de Integração:</p>
                    <p>Esse módulo cruza os valores calculados na aba <strong>Reserva Legal</strong> e na aba <strong>Preservação Permanente (APP)</strong> para fornecer seu passivo líquido.</p>
                  </div>
                </div>
              </div>

              {/* Output Result Side */}
              <div className="lg:col-span-7 space-y-6">
                {totalArea === "" ? (
                  <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-bege-card rounded-3xl bg-bege-claro/10">
                    <ShieldAlert className="w-10 h-10 text-gray-300 mb-3 animate-pulse" />
                    <h3 className="text-sm font-bold text-verde-floresta mb-1">Consolidação do Diagnóstico</h3>
                    <p className="text-xs text-gray-400 max-w-xs font-medium">
                      Insira a Área Total e a Área Utilizada para ver se sua propriedade está regular ou se precisa implantar restauração ambiental.
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Status Badge */}
                    <div className={`p-4 rounded-3xl border ${passivoStatus.border} ${passivoStatus.bg} flex items-center justify-between`}>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Classificação Final</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{passivoStatus.emoji}</span>
                          <span className={`text-base font-bold ${passivoStatus.color}`}>{passivoStatus.label}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold bg-white/90 px-3 py-1.5 rounded-xl shadow-xs border border-bege-card">
                        Passivo Líquido: {environmentalDeficit.toFixed(2)} ha
                      </span>
                    </div>

                    {/* Consolidated Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-bege-claro/30 p-2.5 rounded-xl border border-bege-card/60 text-center">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Obrigações RL</span>
                        <span className="text-sm font-black text-verde-floresta">{calculatedRLRequired.toFixed(2)} ha</span>
                      </div>
                      <div className="bg-bege-claro/30 p-2.5 rounded-xl border border-bege-card/60 text-center">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Obrigações APP</span>
                        <span className="text-sm font-black text-verde-floresta">{totalAppAreaHa.toFixed(2)} ha</span>
                      </div>
                      <div className="bg-bege-claro/30 p-2.5 rounded-xl border border-bege-card/60 text-center">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Vegetação Estimada</span>
                        <span className="text-sm font-black text-verde-natureza">{estimatedVegetation.toFixed(2)} ha</span>
                      </div>
                      <div className={`p-2.5 rounded-xl text-center border ${environmentalDeficit === 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                        <span className="text-[8px] font-bold uppercase tracking-wider block mb-1">Déficit Final</span>
                        <span className="text-sm font-black">{environmentalDeficit.toFixed(2)} ha</span>
                      </div>
                    </div>

                    {/* Consultant Advisory Text */}
                    <div className="bg-white border border-bege-card rounded-3xl p-5 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-verde-natureza/5 rounded-bl-full pointer-events-none"></div>
                      <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-dourado-suave shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-verde-floresta uppercase tracking-wider">Relatório de Regularização Ambiental:</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Analisando de forma sistêmica, seu imóvel exige uma área protegida total de <strong>{(calculatedRLRequired + totalAppAreaHa).toFixed(2)} hectares</strong> (sendo <strong>{calculatedRLRequired.toFixed(2)} ha</strong> de Reserva Legal e <strong>{totalAppAreaHa.toFixed(2)} ha</strong> de Áreas de Preservação Permanente).
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            {environmentalDeficit === 0 ? (
                              <span>🟢 <strong>Seu imóvel possui cobertura vegetal suficiente para atender 100% da lei ambiental!</strong> Nenhuma medida de recomposição é exigida no momento. Mantenha os aceiros limpos e faça monitoramento constante de incêndios para preservar sua floresta.</span>
                            ) : (
                              <span>🔴 <strong>Você precisa recuperar {environmentalDeficit.toFixed(2)} hectares para se adequar plenamente ao Código Florestal.</strong> Esse passivo constitui uma inconformidade legal no CAR que impede a emissão de licenças de supressão, dificulta o financiamento bancário e pode render sanções.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations Card */}
                    <div className="bg-verde-floresta p-4.5 rounded-2xl text-white text-xs leading-relaxed">
                      <h4 className="font-bold text-verde-natureza uppercase tracking-wider mb-1.5">Recomendação Prática:</h4>
                      <ul className="list-disc pl-4 space-y-1 font-medium text-[11px] text-white/90">
                        {environmentalDeficit > 0 ? (
                          <>
                            <li>Inscreva-se no <strong>Cadastro Ambiental Rural (CAR)</strong> do seu estado imediatamente.</li>
                            <li>Aproveite o **Programa de Regularização Ambiental (PRA)** para negociar um cronograma de recuperação de até 20 anos em pequenas parcelas anuais.</li>
                            <li>Considere plantar espécies comerciais consorciadas (como Eucalipto ou Frutíferas) em até 50% da sua Reserva Legal para gerar renda enquanto recupera (Manejo Agroflorestal Sustentável).</li>
                          </>
                        ) : (
                          <>
                            <li>Gere o relatório do CAR e mantenha-o impresso na propriedade para apresentar em vistorias e órgãos fiscalizadores.</li>
                            <li>Você pode receber recursos através do programa de <strong>PSA (Pagamento por Serviços Ambientais)</strong> por conservar vegetação nativa excedente.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
