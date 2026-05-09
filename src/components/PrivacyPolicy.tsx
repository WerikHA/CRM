import React from 'react';
import { Shield, ArrowLeft, Lock, Eye, RefreshCw, ExternalLink, Zap } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
  agencyName: string;
  primaryColor: string;
}

export default function PrivacyPolicy({ onBack, agencyName, primaryColor }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          
          <div className="flex items-center gap-3">
             <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="text-sm font-bold font-display tracking-tight text-slate-900 uppercase">{agencyName}</span>
          </div>

          <div className="w-16" /> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-12 sm:p-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
              <Shield size={14} className="text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Documento Oficial</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.9] mb-8">
              Política de <br />
              <span className="italic text-indigo-600">Privacidade.</span>
            </h1>

            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-12">
              Sua privacidade é nossa prioridade. Este documento detalha como coletamos, usamos e protegemos seus dados dentro do {agencyName}.
            </p>

            <div className="space-y-12 text-slate-600 leading-relaxed font-medium">
              
              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Shield size={18} /></div>
                   1. COMPROMISSO COM A LGPD
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O {agencyName} está em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Tratamos seus dados com transparência, segurança e respeito aos seus direitos como titular.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Lock size={18} /></div>
                   2. CATEGORIAS DE DADOS TRATADOS
                </h2>
                <div className="pl-12 space-y-4">
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Dados de Registro (Owner/Usuário):</strong> Nome, e-mail, senha (criptografada) e preferências do sistema. Finalidade: Execução do contrato e gestão de conta.</li>
                    <li><strong>Dados de Leads e Clientes:</strong> Nome, e-mail, telefone, histórico de interações e notas. Estes dados são inseridos por você ou via formulários públicos. Finalidade: Gestão comercial e CRM.</li>
                    <li><strong>Integrações (Google e Meta):</strong> Tokens de acesso, metadados de arquivos e conteúdos de posts. Finalidade: Viabilizar as funcionalidades de agendamento e armazenamento.</li>
                    <li><strong>Dados Financeiros:</strong> Informações de faturamento e pagamentos processados via Stripe. O CRM não armazena dados de cartão de crédito.</li>
                    <li><strong>Comunicações WhatsApp:</strong> Números de telefone e histórico de mensagens para fins de suporte e automação.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Eye size={18} /></div>
                   3. INTEGRAÇÃO COM SERVIÇOS DO GOOGLEE META
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O Amplifica CRM permite conectar contas do Google e Meta seguindo as políticas de "Uso Limitado". 
                  </p>
                  <p>
                    <strong>Dados acessados:</strong> Apenas o necessário para as funções que você ativar (ex: selecionar mídia no Drive ou publicar no Instagram).
                  </p>
                  <p>
                    <strong>Não comercialização:</strong> Dados de APIs de terceiros NUNCA são vendidos ou usados para fins publicitários externos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><RefreshCw size={18} /></div>
                   4. SEUS DIREITOS (ART. 18 LGPD)
                </h2>
                <div className="pl-12 space-y-4">
                  <p>Como titular de dados, você tem direito a:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Confirmar a existência de tratamento e acessar seus dados;</li>
                    <li>Solicitar a portabilidade dos dados para outro fornecedor;</li>
                    <li>Revogar o consentimento e solicitar a exclusão de dados;</li>
                    <li>Obter informações sobre o compartilhamento de dados.</li>
                  </ul>
                  <p>Para exercer seus direitos, utilize as ferramentas no painel de configurações ou entre em contato com nosso DPO.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Lock size={18} /></div>
                   5. ENCARREGADO DE DADOS (DPO)
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Dúvidas sobre como tratamos seus dados pessoais? Entre em contato com nosso Encarregado (DPO):
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-indigo-600">E-mail: privacidade@amplifamarketing.com.br</p>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">Resposta em até 2 dias úteis</p>
                  </div>
                </div>
              </section>

              <section className="pt-8 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                  Este documento é parte integrante das diretrizes de segurança da {agencyName}. <br />
                  Versão LGPD 1.0 - Última atualização: 09 de Maio de 2026.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
