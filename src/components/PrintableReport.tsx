import React from "react";
import { Printer, X, Shield, Leaf, FileText, Calendar, CheckSquare } from "lucide-react";

interface PrintableReportProps {
  content: string;
  onClose: () => void;
}

export default function PrintableReport({ content, onClose }: PrintableReportProps) {
  const currentDateString = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 sm:p-6" id="printable-report-modal">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 border border-gray-200 flex flex-col">
        
        {/* Modal Controls (Hidden during print) */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-dourado-suave" />
            <span className="font-display font-bold text-sm tracking-wide">PARECER TÉCNICO PRELIMINAR - EXPORTAÇÃO</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-verde-natureza hover:bg-verde-natureza/90 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Content (A4 simulated paper) */}
        <div 
          className="bg-white p-8 sm:p-12 text-gray-900 font-serif leading-relaxed max-w-none print:p-0 print:m-0"
          id="printable-paper-sheet"
        >
          {/* Official Document Header */}
          <div className="border-b-4 border-double border-gray-400 pb-6 mb-8 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Leaf className="w-7 h-7 text-green-800" />
              <span className="font-display font-extrabold text-2xl tracking-widest text-green-900">FOLH.IA</span>
            </div>
            <h1 className="font-display font-bold text-xl uppercase tracking-wider text-gray-800 mb-1">
              PARECER TÉCNICO DE CONFORMIDADE AMBIENTAL PRELIMINAR
            </h1>
            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
              SISTEMA INTELIGENTE DE APOIO À LEGISLAÇÃO AMBIENTAL BRASILEIRA
            </p>
          </div>

          {/* Metadata Block */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans border border-gray-300 p-4 bg-gray-50/50 rounded-lg mb-8">
            <div className="space-y-1">
              <p><strong className="text-gray-700">DOCUMENTO:</strong> LAUDO PRELIMINAR AUTOMÁTICO</p>
              <p><strong className="text-gray-700">EMISSOR:</strong> ASSISTENTE INTELIGENTE FOLH.IA</p>
              <p><strong className="text-gray-700">BASE LEGAL PRINCIPAL:</strong> LEI 12.651 DE 2012 (CÓDIGO FLORESTAL)</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="flex items-center justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <strong className="text-gray-700">DATA DE EMISSÃO:</strong> {currentDateString}
              </p>
              <p><strong className="text-gray-700">REQUISITO:</strong> DECRETO FEDERAL 7.830 / 2012</p>
              <p><strong className="text-gray-700">STATUS PRELIMINAR:</strong> <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">EM ANÁLISE</span></p>
            </div>
          </div>

          {/* Technical Opinion Content */}
          <div className="prose prose-sm max-w-none text-gray-800 space-y-6">
            
            {/* Title / Statement */}
            <div className="text-xs text-justify italic text-gray-500 font-sans border-l-4 border-gray-300 pl-4 py-1 mb-6">
              Este parecer é gerado por algoritmo de inteligência artificial de leitura legal com base nas disposições do Código Florestal Brasileiro. Serve como diretriz preliminar informativa e não substitui a homologação final ou levantamento de campo por responsável técnico credenciado.
            </div>

            {/* Structured Text Render */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 text-justify font-sans">
              {content}
            </div>
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
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 transition-all cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
}
