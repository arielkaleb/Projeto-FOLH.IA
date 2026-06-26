import React from "react";
import { Leaf, User, ShieldAlert, Users, Calculator } from "lucide-react";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onSelectRole: (role: "PRODUCER" | "ANALYST" | "COMMUNITY" | "CALCULATORS") => void;
}

export default function WelcomeScreen({ onSelectRole }: WelcomeScreenProps) {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 text-center select-none" id="welcome-screen-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center max-w-4xl mx-auto"
        id="welcome-logo-container"
      >
        {/* Leaf Logo Emblem */}
        <div 
          className="w-24 h-24 rounded-full bg-verde-floresta flex items-center justify-center shadow-lg mb-8 border-2 border-verde-natureza relative"
          id="leaf-logo-emblem"
        >
          <Leaf className="w-12 h-12 text-white" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-dourado-suave rounded-full border-2 border-bege-claro flex items-center justify-center shadow">
            <span className="text-[9px] font-bold text-white">IA</span>
          </div>
        </div>

        {/* Brand Name */}
        <h1 
          className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-verde-floresta mb-3"
          id="brand-title"
        >
          FOLH<span className="text-verde-natureza">.</span><span className="text-dourado-suave">IA</span>
        </h1>
        
        {/* Sub-tagline */}
        <span className="font-mono text-xs uppercase tracking-widest text-dourado-suave font-semibold mb-6">
          Tecnologia a serviço do campo
        </span>

        {/* Main Headings */}
        <h2 
          className="font-sans text-xl sm:text-2xl font-medium text-verde-floresta leading-snug mb-4 px-2"
          id="tagline-heading"
        >
          Entenda a legislação ambiental sem complicação.
        </h2>

        <p 
          className="text-sm sm:text-base text-gray-600 mb-10 max-w-xl leading-relaxed"
          id="tagline-description"
        >
          A FOLH.IA traduz a legislação ambiental brasileira (CAR, Código Florestal e Decretos) para uma linguagem simples, humana e fácil de entender.
        </p>

        {/* Role Options - Balanced Side-by-Side Cards */}
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4"
          id="role-buttons-grid"
        >
          {/* Enter Platform Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("PRODUCER")}
            className="w-full flex flex-col items-center justify-center p-6 sm:p-8 bg-white border-2 border-bege-card hover:border-verde-natureza rounded-3xl shadow-md transition-all duration-300 cursor-pointer text-center group"
            id="btn-role-producer"
          >
            <div className="w-14 h-14 rounded-full bg-verde-natureza/10 flex items-center justify-center text-verde-natureza mb-4 group-hover:bg-verde-natureza group-hover:text-white transition-all duration-300 shadow-sm">
              <Leaf className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg text-verde-floresta mb-1.5 tracking-wide uppercase">
              CONVERSAR COM A FOLH.IA
            </span>
            <span className="text-xs text-gray-500 leading-relaxed">
              Tire suas dúvidas por texto ou áudio de forma simples, ou envie seus papéis do CAR para análise de legislação.
            </span>
          </motion.button>

          {/* Rural Community Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("COMMUNITY")}
            className="w-full flex flex-col items-center justify-center p-6 sm:p-8 bg-white border-2 border-bege-card hover:border-verde-natureza rounded-3xl shadow-md transition-all duration-300 cursor-pointer text-center group"
            id="btn-role-community"
          >
            <div className="w-14 h-14 rounded-full bg-dourado-suave/10 flex items-center justify-center text-dourado-suave mb-4 group-hover:bg-dourado-suave group-hover:text-white transition-all duration-300 shadow-sm">
              <Users className="w-6 h-6 text-dourado-suave group-hover:text-white" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg text-verde-floresta mb-1.5 tracking-wide uppercase">
              COMUNIDADE DO CAMPO
            </span>
            <span className="text-xs text-gray-500 leading-relaxed">
              Converse com outros produtores da sua região, compartilhe conselhos práticos e crie uma rede colaborativa.
            </span>
          </motion.button>

          {/* Calculadoras Ambientais Button */}
          <motion.button
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("CALCULATORS")}
            className="w-full flex flex-col items-center justify-center p-6 sm:p-8 bg-white border-2 border-bege-card hover:border-verde-natureza rounded-3xl shadow-md transition-all duration-300 cursor-pointer text-center group"
            id="btn-role-calculators"
          >
            <div className="w-14 h-14 rounded-full bg-verde-floresta/10 flex items-center justify-center text-verde-floresta mb-4 group-hover:bg-verde-floresta group-hover:text-white transition-all duration-300 shadow-sm">
              <Calculator className="w-6 h-6 text-verde-floresta group-hover:text-white" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg text-verde-floresta mb-1.5 tracking-wide uppercase">
              CALCULADORAS AMBIENTAIS
            </span>
            <span className="text-xs text-gray-500 leading-relaxed">
              Calcule automaticamente sua APP, Reserva Legal (RL) e Passivo Ambiental com base na Lei 12.651/2012.
            </span>
          </motion.button>
        </div>

        {/* Footer info card */}
        <div className="mt-16 p-4 rounded-xl bg-white/50 border border-bege-card max-w-sm">
          <p className="text-[11px] text-gray-500 leading-normal">
            Fundamentação jurídica com base na Lei 12.651/2012 (Código Florestal) e Decreto Federal 7.830 de 2012.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
