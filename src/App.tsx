import React, { useState } from "react";
import { Award, HelpCircle, ArrowLeft } from "lucide-react";
import WelcomeScreen from "./components/WelcomeScreen";
import ProducerArea from "./components/ProducerArea";
import CommunityArea from "./components/CommunityArea";
import EnvironmentalCalculators from "./components/EnvironmentalCalculators";
import PrintableReport from "./components/PrintableReport";
import { UserRole } from "./types";
import { motion, AnimatePresence } from "motion/react";
import OfficialLogo from "./components/OfficialLogo";

export default function App() {
  const [role, setRole] = useState<UserRole>("HOME");
  const [previewReportContent, setPreviewReportContent] = useState<string | null>(null);

  const selectRole = (selected: "PRODUCER" | "ANALYST" | "COMMUNITY" | "CALCULATORS") => {
    setRole(selected);
  };

  const handleBackToHome = () => {
    setRole("HOME");
  };

  return (
    <div className="min-h-screen bg-bege-claro text-verde-floresta font-sans transition-all duration-500" id="app-root">
      
      {/* Top Brand Navigation Bar */}
      <header className="bg-white border-b border-bege-card px-4 py-3 sticky top-0 z-10 print:hidden" id="main-global-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={handleBackToHome} 
            className="flex items-center space-x-2 cursor-pointer select-none group"
            id="header-logo-button"
          >
            <div className="flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
              <OfficialLogo size="sm" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-verde-floresta">
              FOLH<span className="text-verde-natureza">.</span><span className="text-dourado-suave">IA</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {role !== "HOME" && (
              <div className="flex items-center space-x-1 sm:space-x-2 mr-1 sm:mr-3 bg-bege-claro/50 p-1 rounded-xl border border-bege-card">
                <button
                  onClick={() => setRole("PRODUCER")}
                  className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    role === "PRODUCER"
                      ? "bg-verde-floresta text-white shadow-sm"
                      : "text-verde-floresta hover:bg-white/60"
                  }`}
                  id="header-tab-consult"
                >
                  Consultoria
                </button>
                <button
                  onClick={() => setRole("COMMUNITY")}
                  className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    role === "COMMUNITY"
                      ? "bg-verde-floresta text-white shadow-sm"
                      : "text-verde-floresta hover:bg-white/60"
                  }`}
                  id="header-tab-community"
                >
                  Comunidade
                </button>
                <button
                  onClick={() => setRole("CALCULATORS")}
                  className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    role === "CALCULATORS"
                      ? "bg-verde-floresta text-white shadow-sm"
                      : "text-verde-floresta hover:bg-white/60"
                  }`}
                  id="header-tab-calculators"
                >
                  Calculadoras
                </button>
              </div>
            )}

            {role !== "HOME" && (
              <button
                onClick={handleBackToHome}
                className="text-xs font-bold text-verde-floresta hover:text-verde-natureza flex items-center gap-1 transition-colors cursor-pointer mr-1"
                id="header-btn-back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Início
              </button>
            )}

            <div className="hidden md:flex items-center space-x-1 text-xs text-gray-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-ping"></span>
              <span>Legislação Atualizada: Código Florestal 2012</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Stage with Motion Animations */}
      <main className={`max-w-7xl mx-auto px-4 ${role === "HOME" ? "py-8" : "py-2 sm:py-8"} sm:px-6`} id="app-main-stage">
        <AnimatePresence mode="wait">
          {role === "HOME" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <WelcomeScreen onSelectRole={selectRole} />
            </motion.div>
          )}

          {role === "PRODUCER" && (
            <motion.div
              key="producer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <ProducerArea onBack={handleBackToHome} />
            </motion.div>
          )}

          {role === "COMMUNITY" && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <CommunityArea onBack={handleBackToHome} />
            </motion.div>
          )}

          {role === "CALCULATORS" && (
            <motion.div
              key="calculators"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <EnvironmentalCalculators onBack={handleBackToHome} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Full screen printable PDF Opinion Modal overlay */}
      <AnimatePresence>
        {previewReportContent && (
          <PrintableReport 
            content={previewReportContent} 
            onClose={() => setPreviewReportContent(null)} 
          />
        )}
      </AnimatePresence>

      {/* Soft branding footer */}
      {role === "HOME" && (
        <footer className="py-8 text-center text-xs text-gray-500 border-t border-bege-card bg-white mt-12 print:hidden" id="main-global-footer">
          <div className="max-w-md mx-auto space-y-2">
            <p className="font-semibold text-verde-floresta">
              FOLH.IA &copy; 2026 — Inteligência de Apoio ao Produtor Brasileiro
            </p>
            <p className="px-4">
              Democratizando e simplificando a compreensão do Código Florestal, Decreto 7.830 e o Cadastro Ambiental Rural.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
