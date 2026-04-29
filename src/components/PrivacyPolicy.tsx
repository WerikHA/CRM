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
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Lock size={18} /></div>
                   1. INTEGRAÇÃO COM SERVIÇOS DO GOOGLE (API OAUTH)
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O Amplifica CRM permite que você conecte sua conta do Google para facilitar o fluxo de trabalho. Ao utilizar esta integração, nossa plataforma acessará arquivos do seu Google Drive estritamente para as finalidades permitidas por você.
                  </p>
                  <p>
                    <strong>Dados acessados:</strong> Apenas arquivos que você selecionar ou pastas específicas necessárias para o funcionamento do agendamento e gestão de arquivos dentro do CRM.
                  </p>
                  <p>
                    <strong>Finalidade:</strong> Permitir que o usuário visualize, selecione e anexe documentos e mídias do seu próprio Google Drive diretamente dentro da plataforma Amplifica CRM para fins de organização e agendamento.
                  </p>
                  <p>
                    <strong>Armazenamento de Credenciais:</strong> Não armazenamos sua senha do Google. Utilizamos tokens de acesso OAuth seguros e criptografados para manter a conexão ativa. Você pode revogar este acesso a qualquer momento nas configurações do sistema ou na sua Conta Google.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Eye size={18} /></div>
                   2. POLÍTICA DE USO LIMITADO (GOOGLE API DISCLOSURE)
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo pelo Amplifica CRM seguirão a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.
                  </p>
                  <p>
                    <strong>Não comercialização:</strong> Sob nenhuma hipótese os dados acessados via Google Drive serão vendidos a terceiros ou utilizados para fins publicitários.
                  </p>
                  <p>
                    <strong>Uso restrito:</strong> O acesso aos dados é restrito à execução das funcionalidades solicitadas pelo usuário (visualizar/importar arquivos). Não utilizamos esses dados para treinar modelos de inteligência artificial ou perfis de marketing.
                  </p>
                  <p>
                    <strong>Compartilhamento:</strong> Não compartilhamos o conteúdo do seu Google Drive com outros serviços, exceto quando estritamente necessário para fornecer as funcionalidades que você ativou conscientemente.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><RefreshCw size={18} /></div>
                   3. REVOGAÇÃO DE ACESSO
                </h2>
                <div className="pl-12 space-y-4">
                  <p>
                    A qualquer momento, o usuário poderá desconectar sua conta Google do Amplifica CRM através do menu de "Configurações de Integrações". Além disso, o acesso pode ser removido diretamente na página de segurança da sua Conta Google em: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">myaccount.google.com/permissions <ExternalLink size={12} /></a>. Ao desconectar, todos os tokens de acesso relacionados serão excluídos permanentemente de nossos servidores.
                  </p>
                </div>
              </section>

              <section className="pt-8 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
                  Este documento é parte integrante das diretrizes de segurança da {agencyName}. <br />
                  Última atualização: 29 de Abril de 2026.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
