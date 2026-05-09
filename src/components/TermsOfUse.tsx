import React from 'react';
import { Shield, ArrowLeft, Zap, FileText, Globe, Key, AlertTriangle, Scale, Check, RefreshCw } from 'lucide-react';

interface TermsOfUseProps {
  onBack: () => void;
  agencyName: string;
  primaryColor: string;
}

export default function TermsOfUse({ onBack, agencyName, primaryColor }: TermsOfUseProps) {
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
              <Scale size={14} className="text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Documento Jurídico</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[0.9] mb-8">
              Termos e <br />
              <span className="italic text-indigo-600">Condições.</span>
            </h1>

            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-12">
              Bem-vindo ao {agencyName}. Ao se cadastrar e utilizar nossa plataforma, você concorda em cumprir os seguintes termos.
            </p>

            <div className="space-y-12 text-slate-600 leading-relaxed font-medium">
              
              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Check size={18} /></div>
                   1. ACEITAÇÃO DOS TERMOS
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Ao acessar o site https://crm.amplifamarketing.com.br/, você concorda em ficar vinculado a estes termos de serviço, a todas as leis e regulamentos aplicáveis e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><FileText size={18} /></div>
                   2. LICENÇA DE USO E ACESSO
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O {agencyName} concede uma licença limitada, não exclusiva e revogável para acessar o sistema. É proibido:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Modificar ou copiar os materiais e códigos da plataforma;</li>
                    <li>Tentar descompilar ou fazer engenharia reversa do software;</li>
                    <li>Remover quaisquer direitos autorais ou outras notações de propriedade dos materiais;</li>
                    <li>Usar o sistema para qualquer fim ilegal ou que viole as políticas das redes sociais conectadas.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Globe size={18} /></div>
                   3. CONEXÕES COM TERCEIROS (GOOGLE E META)
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O {agencyName} oferece integração com APIs do Google (Google Drive) e Meta (Facebook/Instagram).
                  </p>
                  <p>
                    <strong>Autorização:</strong> Ao conectar suas contas, você autoriza o sistema a realizar ações em seu nome (como publicar posts ou ler arquivos selecionados do Drive).
                  </p>
                  <p>
                    <strong>Responsabilidade:</strong> Você é o único responsável por manter a segurança de suas credenciais de terceiros. Nós não nos responsabilizamos por suspensões de contas ou bloqueios impostos pelas plataformas externas devido ao conteúdo publicado pelo usuário.
                  </p>
                  <p>
                    <strong>Limitação de Acesso:</strong> O acesso ao seu Google Drive é limitado apenas à seleção de arquivos para uso dentro do CRM, conforme detalhado em nossa Política de Privacidade.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Shield size={18} /></div>
                   4. RESPONSABILIDADE PELO CONTEÚDO
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Você detém todos os direitos sobre o conteúdo (textos, imagens, vídeos) que faz upload ou agenda através do sistema. No entanto:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Você garante que possui os direitos autorais do que está sendo publicado.</li>
                    <li>É terminantemente proibido o uso do sistema para disseminação de spam, conteúdo abusivo, ilegal, ou que infrinja direitos de propriedade intelectual de terceiros.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><AlertTriangle size={18} /></div>
                   5. ISENÇÃO DE RESPONSABILIDADE
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O software é fornecido "como está". O {agencyName} não oferece garantias de que o serviço será ininterrupto ou livre de erros, uma vez que depende de APIs de terceiros (Google e Meta) que podem sofrer instabilidades técnicas ou mudanças em suas políticas sem aviso prévio.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Scale size={18} /></div>
                   6. LIMITAÇÃO DE RESPONSABILIDADE
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Em nenhum caso o {agencyName} ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucros, ou devido à interrupção dos negócios) decorrentes do uso ou da incapacidade de usar o software.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Key size={18} /></div>
                   7. PAGAMENTOS E CANCELAMENTO
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O uso de certas funcionalidades pode estar sujeito a planos de assinatura. O cancelamento pode ser solicitado a qualquer momento, interrompendo a renovação do próximo ciclo de cobrança. Não haverá reembolso por períodos parciais de uso, a menos que exigido por lei.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><RefreshCw size={18} /></div>
                   8. MODIFICAÇÕES
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O {agencyName} pode revisar estes termos de serviço a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Globe size={18} /></div>
                   9. LEI APLICÁVEL
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Estes termos e condições são regidos e interpretados de acordo com as leis da República Federativa do Brasil, especificamente o Marco Civil da Internet e a LGPD.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Key size={18} /></div>
                   10. ENCARREGADO DE DADOS (DPO) E CONTATO
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    Para questões relacionadas aos termos ou privacidade (LGPD), entre em contato com nosso Encarregado através do e-mail: <strong>privacidade@amplifamarketing.com.br</strong>
                  </p>
                  <p>
                    Para questões comerciais ou suporte técnico: <strong>Werikoliveiramarketing@gmail.com</strong>
                  </p>
                </div>
              </section>

              <section className="pt-8 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                  Este documento regula o uso da plataforma {agencyName}. <br />
                  Versão: 1.0 (LGPD Compliant) <br />
                  Última atualização: 09 de Maio de 2026.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
