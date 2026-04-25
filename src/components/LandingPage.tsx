import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Palette, 
  Film, 
  Target, 
  CheckCircle2, 
  ChevronRight, 
  Shield, 
  Zap, 
  Globe,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  agencyName: string;
  primaryColor: string;
}

export default function LandingPage({ onLogin, onSignup, agencyName, primaryColor }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const features = [
    {
      title: 'Gestão de Leads',
      description: 'Capture e gerencie oportunidades com funis de vendas inteligentes e automação.',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      title: 'Workflow Criativo',
      description: 'Centralize solicitações de design e vídeo com aprovação em um clique.',
      icon: Palette,
      color: 'bg-indigo-500'
    },
    {
      title: 'Financeiro Ágil',
      description: 'Controle recebíveis, comissões de parceiros e fluxo de caixa em tempo real.',
      icon: DollarSign,
      color: 'bg-emerald-500'
    },
    {
      title: 'Portal do Parceiro',
      description: 'Ofereça transparência total para seus parceiros com áreas exclusivas.',
      icon: Users,
      color: 'bg-amber-500'
    },
    {
      title: 'Prospecção Ativa',
      description: 'Ferramentas de busca integradas para encontrar clientes ideais rapidamente.',
      icon: Target,
      color: 'bg-rose-500'
    },
    {
      title: 'Vídeo Profissional',
      description: 'Gerencie prazos e entregas de edição de vídeo com foco em alta performance.',
      icon: Film,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>{agencyName}</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Funcionalidades</a>
            <a href="#about" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Sobre</a>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <button 
              onClick={onLogin}
              className="text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
            >
              Fazer Login
            </button>
            <button 
              onClick={onSignup}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Cadastrar-se
            </button>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-gray-100 p-6 space-y-4"
          >
            <a href="#features" className="block text-lg font-medium text-gray-700" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
            <a href="#about" className="block text-lg font-medium text-gray-700" onClick={() => setIsMenuOpen(false)}>Sobre</a>
            <div className="pt-4 flex flex-col gap-3">
              <button onClick={onLogin} className="w-full py-3 text-center border border-gray-200 rounded-xl font-bold">Login</button>
              <button 
                onClick={onSignup} 
                className="w-full py-3 text-center text-white rounded-xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                Cadastrar-se
              </button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold border border-indigo-100 uppercase tracking-wider"
          >
            <Globe size={14} />
            <span>O Próximo Nível da sua Agência</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight max-w-4xl mx-auto"
          >
            Sua <span className="text-indigo-600 bg-clip-text">Agência</span> Operando com Inteligência Máxima.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
          >
            A plataforma completa para gerenciar leads, criativos, financeiro e parceiros em um único lugar. Simplifique processos e foque no que importa: seu crescimento.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button 
              onClick={onSignup}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl text-lg font-bold text-white shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              Começar Agora
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl text-lg font-bold text-gray-700 hover:bg-gray-50 transition-all border-2 border-gray-100"
            >
              Falar com Consultor
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="pt-20 relative max-w-6xl mx-auto"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full -z-10" />
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 md:p-4 overflow-hidden">
               <img 
                 src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" 
                 alt="Painel do CRM" 
                 className="w-full h-auto rounded-2xl shadow-inner border border-gray-100"
               />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Agências', value: '500+' },
            { label: 'Leads Gerados', value: '1.2M+' },
            { label: 'Vídeos Editados', value: '85k+' },
            { label: 'Financeiro', value: 'R$ 45M+' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-indigo-600 mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Tudo o que sua agência <br /><span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">realmente</span> precisa.</h2>
            <p className="text-xl text-gray-500">Desenvolvido por quem entende as dores do mercado de serviços criativos.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={i} 
                className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg", feature.color)}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center text-sm font-bold text-indigo-600 gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  Saiba mais <ChevronRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase 1 */}
      <section className="py-20 px-6 bg-indigo-600 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-bold border border-white/20 uppercase tracking-wider">
              <Zap size={14} />
              <span>Velocidade é Lucro</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">Workflow de Aprovação que funciona. No WhatsApp.</h2>
            <p className="text-xl text-indigo-100 leading-relaxed">
              Esqueça e-mails perdidos. Envie criativos para aprovação direto no WhatsApp do seu cliente com enquetes interativas. Menos atrito, mais entregas.
            </p>
            <ul className="space-y-4">
              {[
                'Link de ajustes dinâmico para o cliente',
                'Visualização em tempo real de alterações',
                'Integração nativa com editores de vídeo',
                'Notificações automáticas para sua equipe'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-medium">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
             <div className="absolute -inset-10 bg-indigo-400 blur-[100px] opacity-20 rounded-full" />
             <div className="bg-indigo-700/50 rounded-3xl p-4 border border-indigo-500 shadow-2xl rotate-3 scale-110">
               <img 
                 src="https://images.unsplash.com/photo-1551288049-bbbda536ad0b?auto=format&fit=crop&q=80&w=2426" 
                 alt="Workflow" 
                 className="rounded-2xl shadow-2xl"
               />
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-gray-950 rounded-[3rem] p-12 md:p-20 text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 blur-[150px] -z-0" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">Pronto para escalar com <span className="text-indigo-400">segurança</span>?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Junte-se a centenas de agências que transformaram sua gestão em uma máquina de escala.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <button 
                onClick={onSignup}
                className="w-full sm:w-auto px-12 py-5 rounded-2xl text-lg font-bold text-white shadow-xl hover:scale-105 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Começar agora gratuitamente
              </button>
              <p className="text-gray-500 text-sm font-medium">Não requer cartão de crédito.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-gray-100 pb-12 mb-12">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-gray-900">{agencyName}</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Termos</a>
              <a href="#" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Privacidade</a>
              <a href="#" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">Contato</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
            <p>© 2026 {agencyName}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Shield size={14} className="text-emerald-500" />
                <span>Dados Protegidos</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-200" />
              <span>v1.2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
