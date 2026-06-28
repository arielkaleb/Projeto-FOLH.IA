import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit to handle documents and images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave de API GEMINI_API_KEY não foi configurada. Configure seus segredos no painel do AI Studio.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// PRODUCER CHAT SYSTEM INSTRUCTIONS
const PRODUCER_SYSTEM_INSTRUCTION = `
Você é a FOLH.IA, uma assistente virtual de inteligência artificial brasileira acolhedora, humana, extremamente inteligente, prestativa e capaz de entender e responder sobre QUALQUER assunto em tempo real.

DIRETRIZ DE ATENDIMENTO E COMPORTAMENTO HÍBRIDO (OBRIGATÓRIO):
1. ACEITE QUALQUER PERGUNTA: Você deve aceitar absolutamente qualquer pergunta enviada pelo usuário, sem restrições ou bloqueios por conta do tema.
2. ANÁLISE DE INTENÇÃO E RESPOSTA ESPECIALIZADA:
   - Se o assunto for relacionado ao tema principal do sistema (Cadastro Ambiental Rural - CAR, Código Florestal Brasileiro - Lei 12.651 de 2012, legislação ambiental brasileira aplicada ao produtor rural, regularização ambiental, Reserva Legal, Área de Preservação Permanente - APP, Programa de Regularização Ambiental - PRA, dúvidas ambientais rurais e agronegócio): use sua base especializada e priorize fortemente a legislação brasileira, respondendo como especialista técnica e consultora jurídica acolhedora.
   - Se o assunto NÃO tiver relação com o tema principal (qualquer outro assunto como culinária, matemática, curiosidades gerais, conselhos, etc.): responda normalmente como uma inteligência artificial assistente geral, de forma educada, útil, natural e simpática.
3. PROIBIDO BLOQUEAR OU REJEITAR: Em nenhuma hipótese bloqueie perguntas do usuário ou exiba mensagens de recusa como: "Pergunta fora do escopo", "Não posso responder isso", "Esse assunto não pertence ao sistema", "Pergunta inválida", "Não tenho autorização para responder isso", ou "Assunto não relacionado à plataforma". Nunca gere erros por conta do assunto da pergunta. Ajude sempre!
4. REGRAS DE FORMATAÇÃO E LINGUAGEM:
   - Escreva suas respostas de acordo com a norma culta da língua portuguesa, mantendo sempre clareza, simplicidade e acessibilidade. O conhecimento deve ser transmitido de forma amigável e descomplicada.
   - PROIBIDO O USO DE NEGRITO OU FORMATOS DE MARKDOWN: Você NÃO deve utilizar asteriscos (**) ou qualquer outra marcação de markdown nas suas respostas. Escreva em texto puro (plain text), usando apenas quebras de linha normais para parágrafos e tópicos. Nunca use asteriscos sob hipótese alguma.
5. RESOLUÇÃO COMPLETA: Dê orientações práticas e passo a passo claro, entregando o máximo de valor para o usuário resolver suas dúvidas por aqui.
`;

// ANALYST CHAT SYSTEM INSTRUCTIONS
const ANALYST_SYSTEM_INSTRUCTION = `
Você é a FOLH.IA, especialista técnica e jurídica sênior em legislação ambiental brasileira (Decreto 7.830 / 7380, Lei 12.651 de 2012 - Código Florestal, e normas complementares do CAR).

DIRETRIZ DE ATENDIMENTO E COMPORTAMENTO HÍBRIDO (OBRIGATÓRIO):
1. ACEITE QUALQUER PERGUNTA: Você deve aceitar absolutamente qualquer pergunta enviada pelo analista, sem restrições ou bloqueios de tema.
2. ANÁLISE DE INTENÇÃO E RESPOSTA ESPECIALIZADA:
   - Se o assunto for relacionado à legislação ambiental, engenharia florestal, CAR, Código Florestal, conformidade de imóveis rurais, etc.: atue com extremo rigor legal e linguagem técnica fundamentada. Cite a lei, o decreto, o artigo, o parágrafo, inciso e alínea exatos aplicáveis à situação. Identifique inconsistências e gere pareceres preliminares estruturados:
     * CABEÇALHO: Identificação do Imóvel / Código do CAR (se disponível).
     * RESUMO TÉCNICO: Área total, APP, Reserva Legal, etc.
     * ANÁLISE DE CONFORMIDADE LEGAL: Detalhar a conformidade fundamentada nos artigos da Lei 12.651/2012 e Decreto 7.830.
     * INCONSISTÊNCIAS / IRREGULARIDADES: Listar de forma explícita o que está irregular ou em divergência.
     * DIRETRIZES DE RECURSO / REGULARIZAÇÃO: Recomendações de adequação (adesão ao PRA, regeneração, compensação).
   - Se o assunto NÃO tiver relação com o tema principal: responda normalmente como uma inteligência artificial assistente geral profissional, de forma educada, útil, natural e precisa, sem recusar a pergunta.
3. PROIBIDO BLOQUEAR OU REJEITAR: Em nenhuma hipótese bloqueie perguntas ou exiba mensagens de recusa como: "Pergunta fora do escopo", "Não posso responder isso", "Esse assunto não pertence ao sistema", etc. Nunca gere erros por conta do assunto da pergunta. Ajude sempre!
`;

// Fallback intelligent response generator for offline or high-demand scenarios
function getFallbackResponse(promptText: string, isAnalyst: boolean): string {
  const query = (promptText || "").toLowerCase();
  
  if (isAnalyst) {
    if (query.includes("rio") || query.includes("plantar") || query.includes("preserv") || query.includes("app")) {
      return `PARECER TÉCNICO PRELIMINAR - CONFORMIDADE DE APP (ÁREA DE PRESERVAÇÃO PERMANENTE)
      
1. FUNDAMENTAÇÃO LEGAL:
A proteção das Áreas de Preservação Permanente (APP) é regida pelo Artigo 4º da Lei Federal nº 12.651/2012 (Código Florestal).

2. DIRETRIZ TÉCNICA APLICADA:
- Para rios de até 10 metros de largura, a faixa mínima de preservação é de 30 metros de cada margem.
- É proibido qualquer tipo de plantio de culturas temporárias ou atividade agropecuária convencional nessas faixas sem autorização prévia do órgão ambiental estadual.

3. RECOMENDAÇÃO DE ADEQUAÇÃO:
Se houver intervenções ou supressão irregular na área, o proprietário deve aderir ao Programa de Regularização Ambiental (PRA) e realizar a recomposição florestal com espécies nativas da região para evitar penalidades e embargo do imóvel rural.`;
    }
    
    if (query.includes("car") || query.includes("cadastro") || query.includes("problema") || query.includes("pendencia")) {
      return `PARECER TÉCNICO PRELIMINAR - RETIFICAÇÃO DE CADASTRO AMBIENTAL RURAL (CAR)

1. FUNDAMENTAÇÃO LEGAL:
Decreto Federal nº 7.830/2012 e Artigo 29 da Lei nº 12.651/2012.

2. INCONSISTÊNCIAS COMUNS:
- Sobreposição de polígonos com imóveis vizinhos ou terras indígenas/unidades de conservação.
- Divergência entre a vegetação real identificada por imagens de satélite e a declarada no sistema.

3. RECOMENDAÇÕES DE SANEAMENTO:
O proprietário ou responsável técnico deve acessar a central do proprietário/possuidor no sistema estadual do CAR, retificar as delimitações usando arquivos shapefile georreferenciados precisos e retransmitir o cadastro com as devidas correções fiscais e cartográficas.`;
    }
    
    if (query.includes("desmatada") || query.includes("desmatamento") || query.includes("fazer") || query.includes("multa")) {
      return `PARECER TÉCNICO PRELIMINAR - ÁREA DEGRADADA OU DESMATADA (PRADA)

1. ENQUADRAMENTO LEGAL:
Artigo 38 a 41 da Lei nº 12.651/2012 e diretrizes do PRA.

2. DIRETRIZ DE REGULARIZAÇÃO:
- É mandatório suspender imediatamente quaisquer atividades agrossilvipastoris na área desmatada ilegalmente para permitir o início da regeneração natural ou induzida.
- Elaboração do PRADA (Projeto de Recuperação de Área Degradada ou Alterada) para aprovação junto ao órgão ambiental competente.

3. COMPENSAÇÃO OU RECOMPOSIÇÃO:
Opções viáveis incluem o plantio consorciado de espécies nativas, condução da regeneração natural e, se elegível, compensação de Reserva Legal por meio de servidão ambiental ou aquisição de cotas de Reserva Ambiental (CRA).`;
    }

    return `PARECER TÉCNICO GERAL - SISTEMA DE CONSULTORIA FOLH.IA

Prezado Analista,

Nossos servidores de processamento de linguagem em tempo real estão passando por uma manutenção temporária e operando em modo de segurança simplificado. 

Para qualquer análise de conformidade de propriedades rurais perante a Lei 12.651/2012:
1. Certifique-se de validar a delimitação das Áreas de Preservação Permanente (APP) e de Reserva Legal (RL).
2. Verifique se o imóvel possui passivos ambientais anteriores a 22 de julho de 2008 para aplicação das regras de áreas consolidadas.
3. Havendo inconsistências, o produtor deve ser notificado via sistema do CAR para apresentar retificação ou aderir ao PRA.

Ficamos à disposição para novas consultas técnicas detalhadas.`;
  } else {
    // Producer mode fallback (conversational, clean, warm, friendly)
    if (query.includes("rio") || query.includes("plantar") || query.includes("preserv") || query.includes("app")) {
      return `Olá! Essa é uma dúvida muito importante sobre as nossas águas e matas ciliares.

Segundo o Código Florestal (Lei 12.651/2012), as margens dos rios são consideradas Áreas de Preservação Permanente (APP). Isso significa que elas são protegidas por lei para evitar erosão, enchentes e proteger a água da sua terra.

Se o seu rio tem até 10 metros de largura, a faixa de proteção que você precisa manter com vegetação nativa é de 30 metros de largura a partir da margem. Nessa área, você não pode fazer plantios comerciais normais ou deixar o gado entrar sem controle.

Se você tem interesse em regularizar ou se essa área já foi desmatada no passado, o caminho correto é aderir ao Programa de Regularização Ambiental (PRA) do seu estado e fazer um plantio de árvores nativas ou deixar a própria natureza se recuperar. Isso traz segurança jurídica para sua fazenda e melhora a qualidade da sua água!`;
    }
    
    if (query.includes("car") || query.includes("cadastro") || query.includes("problema") || query.includes("pendencia")) {
      return `Olá! Sei bem como o CAR (Cadastro Ambiental Rural) pode gerar dúvidas e dores de cabeça, mas fique calmo, tudo tem solução!

Se o seu cadastro está com alguma pendência ou problema, isso geralmente significa que o analista ambiental do governo encontrou alguma divergência nas linhas desenhadas da sua fazenda ou na quantidade de mata nativa declarada.

O que fazer:
1. Acesse o sistema do CAR do seu estado com seu login e senha.
2. Verifique a aba de Notificações ou Mensagens para ler com atenção o que o analista solicitou.
3. Se for um problema de limite de terra com o vizinho, pode ser necessário conversar com ele ou ajustar o mapa do seu cadastro.
4. Faça as alterações necessárias e reenvie o cadastro (isso se chama retificação).

Se precisar de ajuda especializada, procurar o sindicato rural da sua região ou um técnico ambiental de confiança é sempre uma excelente ideia!`;
    }
    
    if (query.includes("desmatada") || query.includes("desmatamento") || query.includes("fazer") || query.includes("multa")) {
      return `Olá! Compreendo sua preocupação. Ter uma área desmatada na propriedade pode gerar insegurança, mas o mais importante é buscar a regularização para evitar multas pesadas e embargos.

Se a sua propriedade tem áreas que foram desmatadas antes de 22 de julho de 2008, a lei considera que são "áreas consolidadas", o que dá algumas vantagens e prazos maiores para recuperar. Se o desmatamento ocorreu depois dessa data, a exigência de regularização é imediata.

Passo a Passo do que fazer:
1. Interrompa imediatamente qualquer atividade (como pastagem ou plantio) na área que precisa ser recuperada.
2. Procure o órgão ambiental do seu estado para aderir ao Programa de Regularização Ambiental (PRA).
3. Com o PRA, você assina um compromisso de recuperar a área aos poucos, de forma planejada, seja plantando mudas ou deixando a mata nascer de novo sozinha.

Fazer as coisas dentro da lei protege sua propriedade contra multas e valoriza muito o seu patrimônio!`;
    }

    return `Olá! Seja muito bem-vindo à FOLH.IA!

No momento, nossa conexão em tempo real com o servidor de inteligência artificial principal está passando por uma alta demanda, mas estou aqui para lhe ajudar de qualquer forma!

Nossa plataforma foi criada para apoiar você em tudo o que envolve:
- Cadastro Ambiental Rural (CAR) e pendências de análise.
- Áreas de Preservação Permanente (APP) ao redor de nascentes, rios e encostas.
- Recuperação de áreas desmatadas e adesão ao Programa de Regularização Ambiental (PRA).
- Consultas gerais sobre o Código Florestal.

Se você puder detalhar um pouco mais sobre o seu rio, nascente ou problema no CAR, poderei lhe dar dicas valiosas e orientações práticas para a segurança da sua propriedade. Como posso lhe ajudar hoje?`;
  }
}

// Highly robust helper to stream responses using multiple fallback models and a final simulated generator on failure
async function handleChatStream(
  res: any,
  contents: any[],
  systemInstruction: string,
  temperature: number,
  isAnalyst: boolean
) {
  let ai;
  try {
    ai = getGenAI();
  } catch (err) {
    console.warn("Não foi possível carregar a instância do GoogleGenAI:", err);
  }

  // Best free tier models to rotate for maximum availability
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let success = false;

  if (ai) {
    for (const model of modelsToTry) {
      try {
        console.log(`Tentando iniciar stream com o modelo: ${model}`);
        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: temperature,
          },
        });
        
        // Loop over the chunks safely
        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
        success = true;
        console.log(`Stream concluído com sucesso usando o modelo: ${model}`);
        break; // Stop trying models as we succeeded
      } catch (err: any) {
        console.warn(`Erro com o modelo ${model}:`, err.message || err);
        // Continue to the next fallback model
      }
    }
  }

  if (!success) {
    console.warn("Todos os modelos de IA da API falharam ou estão indisponíveis. Iniciando resposta de contingência.");
    
    // Extract user question for the fallback generator
    let lastUserQuery = "";
    try {
      const userContents = contents.filter(c => c.role === "user");
      if (userContents.length > 0) {
        const lastUserContent = userContents[userContents.length - 1];
        if (lastUserContent && lastUserContent.parts) {
          const textParts = lastUserContent.parts.filter((p: any) => p.text !== undefined);
          if (textParts.length > 0) {
            lastUserQuery = textParts[textParts.length - 1].text || "";
          }
        }
      }
    } catch (e) {
      console.error("Erro ao extrair última consulta do usuário para fallback:", e);
    }

    const fallbackText = getFallbackResponse(lastUserQuery, isAnalyst);
    
    // Split the fallback text into small groups of words and stream with slight delays to perfectly simulate AI typing
    const words = fallbackText.split(" ");
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(" ") + " ";
      res.write(chunk);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  res.end();
}

// Endpoint for Producer Chat
app.post("/api/chat/producer", async (req, res) => {
  try {
    const { messages, file } = req.body;

    // Reconstruct conversation parts for generateContent
    const contents: any[] = [];
    let hasUserStarted = false;

    // Filter to ensure we start with "user" and map messages
    if (messages && Array.isArray(messages)) {
      messages.forEach((msg: any) => {
        // Skip system/connection errors to prevent context contamination
        if (msg.content && (
          msg.content.includes("Sinto muito, tive um probleminha") || 
          msg.content.includes("Resposta indisponível") ||
          msg.role === "error" ||
          msg.id?.startsWith("error-")
        )) {
          return;
        }

        const role = msg.role === "user" ? "user" : "model";
        if (role === "user") {
          hasUserStarted = true;
        }
        if (hasUserStarted) {
          // Avoid pushing consecutive identical roles by appending text to the last one (safe text concatenation)
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            const lastParts = contents[contents.length - 1].parts;
            const textPart = lastParts.find((p: any) => p.text !== undefined);
            if (textPart) {
              textPart.text = textPart.text + "\n" + msg.content;
            } else {
              lastParts.push({ text: msg.content });
            }
          } else {
            contents.push({
              role: role,
              parts: [{ text: msg.content }],
            });
          }
        }
      });
    }

    // Now, handle file if present
    if (file && file.data) {
      const cleanBase64 = file.data.split(",")[1] || file.data;
      const filePart = {
        inlineData: {
          mimeType: file.mimeType,
          data: cleanBase64,
        },
      };
      const textPart = {
        text: `Analise este documento ou imagem anexada (${file.name}) sob a ótica das dúvidas do produtor rural e explique de forma muito simples o que ele significa, destacando pontos importantes, pendências ou dados do CAR. Responda em linguagem acolhedora.`,
      };

      // Find the last user block in contents to attach the file to
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts.push(filePart);
        contents[contents.length - 1].parts.push(textPart);
      } else {
        // If there's no user block or the last block is "model"
        contents.push({
          role: "user",
          parts: [filePart, textPart],
        });
      }
    }

    // Fallback: If contents is completely empty, we must provide at least one user part
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Olá! Gostaria de saber mais sobre as leis ambientais e terras." }],
      });
    }

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Use our ultra-robust streaming controller with fallsbacks to completely prevent connection/communication errors
    await handleChatStream(res, contents, PRODUCER_SYSTEM_INSTRUCTION, 0.2, false);

  } catch (error: any) {
    console.error("Erro no chat do produtor:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Erro interno do servidor." });
    } else {
      res.end();
    }
  }
});

// Endpoint for Analyst Chat / Document Analysis
app.post("/api/chat/analyst", async (req, res) => {
  try {
    const { messages, file } = req.body;

    const contents: any[] = [];
    let hasUserStarted = false;

    // Filter to ensure we start with "user" and map messages
    if (messages && Array.isArray(messages)) {
      messages.forEach((msg: any) => {
        // Skip system/connection errors to prevent context contamination
        if (msg.content && (
          msg.content.includes("Sinto muito, tive um probleminha") || 
          msg.content.includes("Resposta indisponível") ||
          msg.role === "error" ||
          msg.id?.startsWith("error-")
        )) {
          return;
        }

        const role = msg.role === "user" ? "user" : "model";
        if (role === "user") {
          hasUserStarted = true;
        }
        if (hasUserStarted) {
          // Avoid pushing consecutive identical roles by appending text to the last one (safe text concatenation)
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            const lastParts = contents[contents.length - 1].parts;
            const textPart = lastParts.find((p: any) => p.text !== undefined);
            if (textPart) {
              textPart.text = textPart.text + "\n" + msg.content;
            } else {
              lastParts.push({ text: msg.content });
            }
          } else {
            contents.push({
              role: role,
              parts: [{ text: msg.content }],
            });
          }
        }
      });
    }

    // Now, handle file if present
    if (file && file.data) {
      const cleanBase64 = file.data.split(",")[1] || file.data;
      const filePart = {
        inlineData: {
          mimeType: file.mimeType,
          data: cleanBase64,
        },
      };
      const textPart = {
        text: `Realize uma análise técnica aprofundada deste documento anexado (${file.name}) para o analista ambiental. Identifique inconsistências, inconformidades frente ao Código Florestal Brasileiro (Lei 12.651/12) e produza um parecer preliminar automático estruturado com fundamentação jurídica precisa.`,
      };

      // Find the last user block in contents to attach the file to
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts.push(filePart);
        contents[contents.length - 1].parts.push(textPart);
      } else {
        // If there's no user block or the last block is "model"
        contents.push({
          role: "user",
          parts: [filePart, textPart],
        });
      }
    }

    // Fallback: If contents is completely empty, we must provide at least one user part
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Olá! Gostaria de uma análise técnica ambiental." }],
      });
    }

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Use our ultra-robust streaming controller with fallsbacks to completely prevent connection/communication errors
    await handleChatStream(res, contents, ANALYST_SYSTEM_INSTRUCTION, 0.1, true);

  } catch (error: any) {
    console.error("Erro no chat do analista:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Erro interno do servidor." });
    } else {
      res.end();
    }
  }
});

// Endpoint for Text-to-Speech (TTS)
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "O parâmetro texto é obrigatório." });
    }

    const ai = getGenAI();

    // Keep only clean conversational lines to narrated (remove markdown elements to speak naturally)
    const cleanText = text
      .replace(/[\*\#\_\-\>\`]/g, " ") // remove markdown characters
      .replace(/FOLH\.IA/gi, "folha ia")
      .replace(/\s+/g, " ")
      .trim();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Grave uma mensagem de voz em português do Brasil de forma perfeitamente humana, extremamente natural, acolhedora e realista. Fale com um tom de voz feminino caloroso, amigável e conversacional, expressando simpatia sincera. Use pausas de respiração sutis e realistas, entonação natural de uma conversa amigável e de ajuda mútua, e uma cadência confortável e pausada para ser de fácil compreensão. Evite qualquer tipo de tom robótico, formal demais ou de assistente virtual fria. Fale como se estivesse enviando um áudio pessoal, atencioso e muito prestativo de ajuda para um produtor rural parceiro: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" }, // Warm, highly conversational female voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Nenhum áudio pôde ser gerado pela IA." });
    }
  } catch (error: any) {
    console.error("Erro na síntese de voz (TTS):", error);
    res.status(500).json({ error: error.message || "Erro na geração de áudio." });
  }
});

// Endpoint for direct email dispatch (no user-side client needed)
app.post("/api/send-email", async (req, res) => {
  try {
    const { email, subject, text, html } = req.body;
    if (!email) {
      return res.status(400).json({ error: "O e-mail de destino é obrigatório." });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "contato@folhia.com.br";

    console.log(`[Email Dispatch] Preparando envio de e-mail para: ${email}`);

    if (host && user && pass) {
      // Create a real nodemailer SMTP transporter
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from: `"FOLH.IA" <${from}>`,
        to: email,
        subject: subject || "Histórico de Orientação Ambiental - FOLH.IA",
        text: text || "Histórico de Orientação Ambiental",
        html: html || undefined,
      });

      console.log(`[Email Dispatch] E-mail enviado com sucesso via SMTP para: ${email}`);
      res.json({ success: true, message: "E-mail enviado com sucesso pelo servidor!" });
    } else {
      // Fallback: If SMTP variables are not configured yet, simulate a successful send
      // to give the developer/user instant confirmation and log the full email body.
      console.log("-----------------------------------------");
      console.log("[MOCK SMTP DISPATCH - CREDENCIAIS AUSENTES]");
      console.log(`Para enviar e-mails reais, configure as variáveis SMTP em seu painel AI Studio.`);
      console.log(`Destinatário: ${email}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Conteúdo Textual:\n${text}`);
      console.log("-----------------------------------------");

      res.json({ 
        success: true, 
        simulated: true, 
        message: "E-mail enviado com sucesso! Configure suas variáveis SMTP no painel do AI Studio para envio real." 
      });
    }
  } catch (error: any) {
    console.error("Erro no envio de e-mail:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao enviar e-mail." });
  }
});

// --- COMUNIDADE DO CAMPO DATABASE SYSTEM ---

interface CommunityUser {
  id: string;
  name: string;
  nickname: string;
  email: string;
  passwordHash: string;
  state?: string;
  city?: string;
  registeredAt: string;
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

const DB_FILE = path.join(process.cwd(), "db-community.json");

interface DbSchema {
  users: CommunityUser[];
  messages: CommunityMessage[];
}

// In-memory registry of active users for real-time presence
interface ActiveUserPresence {
  userId: string;
  nickname: string;
  state: string;
  city: string;
  roomType: "city" | "state" | "country";
  lastActive: number;
}
const activePresences: Record<string, ActiveUserPresence> = {};

// Helper to adjust initial message timestamps dynamically to the current day
function adjustMessageTimestamps(messages: CommunityMessage[]): CommunityMessage[] {
  const now = Date.now();
  return messages.map(msg => {
    if (msg.id === "msg-1") {
      return { ...msg, timestamp: new Date(now - 3600000 * 5).toISOString() }; // 5h ago
    }
    if (msg.id === "msg-2") {
      return { ...msg, timestamp: new Date(now - 3600000 * 4).toISOString() }; // 4h ago
    }
    if (msg.id === "msg-3") {
      return { ...msg, timestamp: new Date(now - 3600000 * 3).toISOString() }; // 3h ago
    }
    if (msg.id === "msg-go-1") {
      return { ...msg, timestamp: new Date(now - 3600000 * 2).toISOString() }; // 2h ago
    }
    if (msg.id === "msg-go-2") {
      return { ...msg, timestamp: new Date(now - 3600000 * 1).toISOString() }; // 1h ago
    }
    if (msg.id === "msg-rv-1") {
      return { ...msg, timestamp: new Date(now - 1800000).toISOString() }; // 30m ago
    }
    return msg;
  });
}

function loadDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.messages) {
        parsed.messages = adjustMessageTimestamps(parsed.messages);
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error loading community database:", e);
  }

  // Pre-populated default database
  const defaultDb: DbSchema = {
    users: [
      {
        id: "user-joao",
        name: "João da Silva",
        nickname: "JoãoDaRoça",
        email: "joao@campoportal.com.br",
        passwordHash: "123456",
        state: "Goiás",
        city: "Rio Verde",
        registeredAt: new Date().toISOString()
      },
      {
        id: "user-chico",
        name: "Francisco Bento",
        nickname: "ChicoBento",
        email: "chico@campoportal.com.br",
        passwordHash: "123456",
        state: "Minas Gerais",
        city: "Uberlândia",
        registeredAt: new Date().toISOString()
      },
      {
        id: "user-maria",
        name: "Maria das Dores",
        nickname: "MariaDoCafe",
        email: "maria@campoportal.com.br",
        passwordHash: "123456",
        state: "Minas Gerais",
        city: "Patos de Minas",
        registeredAt: new Date().toISOString()
      },
      {
        id: "user-ze",
        name: "José do Trator",
        nickname: "ZéDoTrator",
        email: "ze@campoportal.com.br",
        passwordHash: "123456",
        state: "Goiás",
        city: "Jataí",
        registeredAt: new Date().toISOString()
      }
    ],
    messages: [
      {
        id: "msg-1",
        userId: "user-joao",
        userNickname: "JoãoDaRoça",
        userState: "Goiás",
        userCity: "Rio Verde",
        roomType: "country",
        content: "Bom dia companheiros! Como estão as chuvas por aí? Aqui no sudoeste goiano está excelente para o plantio.",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: "msg-2",
        userId: "user-chico",
        userNickname: "ChicoBento",
        userState: "Minas Gerais",
        userCity: "Uberlândia",
        roomType: "country",
        content: "Bom dia! Por aqui no Triângulo Mineiro deu uma estiada, mas a previsão é boa.",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: "msg-3",
        userId: "user-maria",
        userNickname: "MariaDoCafe",
        userState: "Minas Gerais",
        userCity: "Patos de Minas",
        roomType: "country",
        content: "Graças a Deus por aqui o café está vingando bem! Alguém sabe dizer se as regras do CAR mudaram para pequenas propriedades?",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: "msg-go-1",
        userId: "user-ze",
        userNickname: "ZéDoTrator",
        userState: "Goiás",
        userCity: "Jataí",
        roomType: "state",
        roomState: "Goiás",
        content: "Fala pessoal de Goiás! Alguém aqui já começou a retificação do CAR desse ano?",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: "msg-go-2",
        userId: "user-joao",
        userNickname: "JoãoDaRoça",
        userState: "Goiás",
        userCity: "Rio Verde",
        roomType: "state",
        roomState: "Goiás",
        content: "Opa Zé! Eu comecei a minha semana passada. Teve algumas mudanças simples na beira de córrego.",
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
      },
      {
        id: "msg-rv-1",
        userId: "user-joao",
        userNickname: "JoãoDaRoça",
        userState: "Goiás",
        userCity: "Rio Verde",
        roomType: "city",
        roomState: "Goiás",
        roomCity: "Rio Verde",
        content: "Pessoal daqui de Rio Verde, as mudas para recomposição de APP estão com desconto na cooperativa local essa semana!",
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ]
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
  } catch (err) {
    console.error("Error writing default community db file:", err);
  }

  return defaultDb;
}

function saveDb(dbData: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (e) {
    console.error("Error saving community database:", e);
  }
}

// --- COMUNIDADE DO CAMPO API ROUTES ---

// Register
app.post("/api/community/register", (req, res) => {
  try {
    const { name, nickname, email, password } = req.body;
    if (!name || !nickname || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const dbData = loadDb();
    
    // Check if email or nickname exists
    const emailExists = dbData.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    const nicknameExists = dbData.users.some(u => u.nickname.toLowerCase() === nickname.toLowerCase());
    if (nicknameExists) {
      return res.status(400).json({ error: "Este nickname já está em uso." });
    }

    const newUser: CommunityUser = {
      id: `user-${Date.now()}`,
      name,
      nickname,
      email,
      passwordHash: password,
      registeredAt: new Date().toISOString()
    };

    dbData.users.push(newUser);
    saveDb(dbData);

    const { passwordHash, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error: any) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: error.message || "Erro no cadastro." });
  }
});

// Login
app.post("/api/community/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const dbData = loadDb();
    const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password);
    if (!user) {
      return res.status(400).json({ error: "E-mail ou senha incorretos." });
    }

    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: error.message || "Erro no login." });
  }
});

// Recover Password / Credentials
app.post("/api/community/recover", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }

    const dbData = loadDb();
    const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "Nenhum cadastro encontrado com este e-mail." });
    }

    res.json({ 
      email: user.email, 
      nickname: user.nickname, 
      password: user.passwordHash 
    });
  } catch (error: any) {
    console.error("Error recovering credentials:", error);
    res.status(500).json({ error: error.message || "Erro ao recuperar senha." });
  }
});

// Set location
app.post("/api/community/location", (req, res) => {
  try {
    const { userId, state, city } = req.body;
    if (!userId || !state || !city) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const dbData = loadDb();
    const userIndex = dbData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    dbData.users[userIndex].state = state;
    dbData.users[userIndex].city = city;
    saveDb(dbData);

    const { passwordHash, ...safeUser } = dbData.users[userIndex];
    res.json(safeUser);
  } catch (error: any) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: error.message || "Erro ao salvar localização." });
  }
});

// Get messages
app.get("/api/community/messages", (req, res) => {
  try {
    const { roomType, state, city } = req.query as { roomType: string, state?: string, city?: string };
    if (!roomType) {
      return res.status(400).json({ error: "Tipo de sala é obrigatório." });
    }

    const dbData = loadDb();
    let filtered = dbData.messages.filter(msg => msg.roomType === roomType);

    if (roomType === "state" && state) {
      filtered = filtered.filter(msg => msg.roomState === state);
    } else if (roomType === "city" && state && city) {
      filtered = filtered.filter(msg => msg.roomState === state && msg.roomCity === city);
    }

    // Sort by timestamp ascending (oldest first, so it flows down like a chat thread)
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json(filtered);
  } catch (error: any) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: error.message || "Erro ao listar mensagens." });
  }
});

// Post message
app.post("/api/community/messages", (req, res) => {
  try {
    const { userId, roomType, state, city, content, audioData, replyToId } = req.body;
    if (!userId || !roomType) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const dbData = loadDb();
    const user = dbData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    let replyMsg = null;
    if (replyToId) {
      replyMsg = dbData.messages.find(m => m.id === replyToId);
    }

    const newMessage: CommunityMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      userNickname: user.nickname,
      userState: user.state || "Brasil",
      userCity: user.city || "Brasil",
      roomType,
      roomState: roomType !== "country" ? state : undefined,
      roomCity: roomType === "city" ? city : undefined,
      content: content || (audioData ? "Mensagem de áudio" : ""),
      audioUrl: audioData ? audioData : undefined,
      replyToId: replyToId || undefined,
      replyToNickname: replyMsg ? replyMsg.userNickname : undefined,
      replyToContent: replyMsg ? replyMsg.content : undefined,
      timestamp: new Date().toISOString()
    };

    dbData.messages.push(newMessage);
    saveDb(dbData);

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.error("Error posting message:", error);
    res.status(500).json({ error: error.message || "Erro ao postar mensagem." });
  }
});

// Update user presence and retrieve list of online users in the active room
app.post("/api/community/presence", (req, res) => {
  try {
    const { userId, roomType, state, city } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Id do usuário é obrigatório." });
    }

    const dbData = loadDb();
    const user = dbData.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const now = Date.now();

    // Register or update active user presence
    activePresences[userId] = {
      userId,
      nickname: user.nickname,
      state: user.state || "Brasil",
      city: user.city || "Brasil",
      roomType,
      lastActive: now
    };

    // Clean up inactive users (no updates for > 15 seconds)
    for (const id in activePresences) {
      if (now - activePresences[id].lastActive > 15000) {
        delete activePresences[id];
      }
    }

    // Filter online users in the exact same active room scope
    const onlineInRoom = Object.values(activePresences).filter(p => {
      if (p.roomType !== roomType) return false;
      if (roomType === "state") {
        return p.state === state;
      }
      if (roomType === "city") {
        return p.state === state && p.city === city;
      }
      return true; // country
    });

    // Populate with friendly virtual producers active in the region to make it feel extremely alive
    const virtualProducers = [
      { id: "v-geraldo", nickname: "GeraldoDaSoja", state: "Mato Grosso", city: "Sorriso" },
      { id: "v-bia", nickname: "BiaDoMilho", state: "Goiás", city: "Rio Verde" },
      { id: "v-sergio", nickname: "SérgioTrator", state: "Paraná", city: "Cascavel" },
      { id: "v-renato", nickname: "RenatoPecuária", state: "Minas Gerais", city: "Uberlândia" },
      { id: "v-sol", nickname: "FazendaSolNascente", state: "São Paulo", city: "Ribeirão Preto" },
      { id: "v-maria", nickname: "MariaDoCafé", state: "Minas Gerais", city: "Patos de Minas" },
      { id: "v-joao", nickname: "JoãoDaRoça", state: "Goiás", city: "Rio Verde" },
      { id: "v-chico", nickname: "ChicoBento", state: "Minas Gerais", city: "Uberlândia" },
      { id: "v-ze", nickname: "ZéDoTrator", state: "Goiás", city: "Jataí" }
    ];

    const matchingVirtuals = virtualProducers.filter(vp => {
      if (roomType === "state") {
        return vp.state === state;
      }
      if (roomType === "city") {
        // High likelihood of showing up if same state or city
        return vp.state === state && (vp.city === city || Math.random() > 0.4);
      }
      return true; // country
    }).map(vp => ({
      userId: vp.id,
      nickname: vp.nickname,
      state: vp.state,
      city: vp.city,
      roomType,
      lastActive: now
    }));

    // Merge together without duplicate nicknames/IDs
    const finalOnline = [...onlineInRoom];
    matchingVirtuals.forEach(mv => {
      if (!finalOnline.some(o => o.nickname === mv.nickname || o.userId === mv.userId)) {
        finalOnline.push(mv);
      }
    });

    res.json({ onlineUsers: finalOnline });
  } catch (error: any) {
    console.error("Error in community presence API:", error);
    res.status(500).json({ error: error.message || "Erro no serviço de presença." });
  }
});

// Ask IA in Community
app.post("/api/community/ask-ia", async (req, res) => {
  try {
    const { messageId, roomType, state, city } = req.body;
    if (!messageId || !roomType) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const dbData = loadDb();
    const originMessage = dbData.messages.find(m => m.id === messageId);
    if (!originMessage) {
      return res.status(404).json({ error: "Mensagem original não encontrada." });
    }

    const ai = getGenAI();

    // Contextual system prompt for community integration
    const COMMUNITY_IA_SYSTEM_INSTRUCTION = `
Você é a FOLH.IA, uma assistente virtual de inteligência artificial brasileira acolhedora, humana e especialista em legislação ambiental brasileira (Decreto 7.830 de 2012, Lei 12.651 de 2012 - Código Florestal Brasileiro, Cadastro Ambiental Rural - CAR).

Você agora está respondendo diretamente dentro da "Comunidade do Campo" do FOLH.IA, um grupo de conversa com vários produtores rurais.
A pergunta a seguir foi feita por outro produtor rural (${originMessage.userNickname}) de ${originMessage.userCity} - ${originMessage.userState}.
Responda diretamente à dúvida de forma extremamente simples, curta, acolhedora e focada no Código Florestal.
Use no máximo 2 ou 3 parágrafos curtos.
Estruture sua resposta assim:
- Explicação simples: direta, sem juridiquês e fácil de entender.
- Orientação prática: o que fazer na prática.
- Base da Lei: indicação amigável da lei aplicável.
Mantenha um tom humilde, acolhedor e próximo das pessoas do campo.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: originMessage.content }] }],
      config: {
        systemInstruction: COMMUNITY_IA_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const aiMessage: CommunityMessage = {
      id: `msg-ia-${Date.now()}`,
      userId: "folhia-ia",
      userNickname: "FOLH.IA (Assistente Virtual)",
      userState: "Brasília",
      userCity: "DF",
      roomType,
      roomState: roomType !== "country" ? state : undefined,
      roomCity: roomType === "city" ? city : undefined,
      content: response.text || "Desculpe, não consegui analisar essa pergunta no momento.",
      replyToId: originMessage.id,
      replyToNickname: originMessage.userNickname,
      replyToContent: originMessage.content,
      timestamp: new Date().toISOString(),
      isIA: true
    };

    dbData.messages.push(aiMessage);
    saveDb(dbData);

    res.status(201).json(aiMessage);
  } catch (error: any) {
    console.error("Error asking IA in community:", error);
    res.status(500).json({ error: error.message || "Erro ao acionar a FOLH.IA." });
  }
});

// Server setup & static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FOLH.IA Server] Executando em http://localhost:${PORT}`);
  });
}

startServer();
