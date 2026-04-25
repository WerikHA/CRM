import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Palette, 
  Film, 
  Target, 
  ChevronRight, 
  Zap, 
  Globe,
  ArrowRight,
  Menu,
  X,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
      title: 'Controle de Leads',
      description: 'Centralize todos os seus leads. Acompanhe cada etapa da negociação com funis visuais e automação de acompanhamento.',
      icon: TrendingUp,
    },
    {
      title: 'Workflow de Aprovação',
      description: 'Envie criativos de design e vídeos para aprovação via WhatsApp. Seu cliente aprova com um clique, sem e-mails infinitos.',
      icon: Palette,
    },
    {
      title: 'Painel Financeiro',
      description: 'Saiba exatamente quanto sua agência está lucrando. Gestão de faturamento, comissões de parceiros e fluxo de caixa.',
      icon: DollarSign,
    },
    {
      title: 'Área do Parceiro',
      description: 'Ofereça um portal exclusivo para seus parceiros acompanharem as demandas e resultados em tempo real.',
      icon: Users,
    },
    {
      title: 'Prospecção Geográfica',
      description: 'Encontre novos clientes próximos a você usando nossa ferramenta de mapa integrada com dados de empresas.',
      icon: Target,
    },
    {
      title: 'Produção Audiovisual',
      description: 'Módulo específico para editores de vídeo, com controle de versões, prazos e feedbacks estruturados.',
      icon: Film,
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Configure sua Agência',
      description: 'Personalize com sua marca, cores e integre suas ferramentas favoritas em minutos.'
    },
    {
      number: '02',
      title: 'Importe seus Leads',
      description: 'Conecte suas fontes de leads e comece a organizar sua pipeline de vendas imediatamente.'
    },
    {
      number: '03',
      title: 'Escale sua Operação',
      description: 'Gerencie demandas criativas e aprovações com agilidade recorde e transparência total.'
    }
  ];

  const stats = [
    { label: 'Agências Ativas', value: '1.2k', sub: 'No ecossistema' },
    { label: 'Leads Gerados', value: '850k', sub: 'Este trimestre' },
    { label: 'Projetos Entregues', value: '45k', sub: 'Com agilidade' },
    { label: 'Média de ROI', value: '310%', sub: 'Pelos clientes' }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_8px_16px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-transform">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">{agencyName}</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Funcionalidades</a>
            <a href="#workflow" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Workflow</a>
            <a href="#pricing" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Preços</a>
            <button onClick={onLogin} className="text-sm font-bold text-slate-900 hover:opacity-70 transition-opacity">Entrar</button>
            <button 
              onClick={onSignup}
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Começar Grátis
            </button>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <a href="#features" className="block text-lg font-bold text-slate-700" onClick={() => setIsMenuOpen(false)}>Funcionalidades</a>
                <a href="#workflow" className="block text-lg font-bold text-slate-700" onClick={() => setIsMenuOpen(false)}>Como Funciona</a>
                <div className="pt-4 flex flex-col gap-3">
                  <button onClick={onLogin} className="w-full py-4 text-center border border-slate-100 rounded-2xl font-bold">Login</button>
                  <button 
                    onClick={onSignup} 
                    className="w-full py-4 text-center text-white rounded-2xl font-bold shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Cadastrar-se
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[20%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_white_100%)]" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group mb-10 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors backdrop-blur-sm cursor-pointer"
            >
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-600 transition-colors">Nova versão 2.4 disponível</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl sm:text-8xl md:text-[9rem] font-black text-slate-900 leading-[0.85] tracking-[-0.04em] mb-12"
            >
              Transforme caos <br /> em <span className="relative inline-block">
                <span className="relative z-10 text-indigo-600 italic">escala.</span>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="absolute bottom-4 left-0 h-4 bg-indigo-100 -z-10" 
                />
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl sm:text-3xl text-slate-500 max-w-3xl mx-auto leading-tight mb-16 font-medium tracking-tight"
            >
              O sistema operacional definitivo para agências que não aceitam mediocridade. Gestão, aprovação e lucro em um só lugar.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center gap-6 mb-32"
            >
              <button 
                onClick={onSignup}
                className="w-full sm:w-auto px-14 py-6 rounded-full text-xl font-black text-white shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 bg-indigo-600 uppercase tracking-widest"
              >
                Inicie sua Jornada
                <ArrowRight size={24} />
              </button>
              <button 
                onClick={onLogin}
                className="group w-full sm:w-auto px-14 py-6 rounded-full text-xl font-black text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-3 uppercase tracking-widest"
              >
                Explorar Demo
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-6xl mx-auto"
            >
              <div className="absolute -inset-10 bg-indigo-500/10 rounded-[4rem] blur-3xl -z-10 opacity-50" />
              <div className="relative bg-white rounded-[3.5rem] p-4 sm:p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-12 bg-slate-50/50 flex items-center px-8 gap-2 border-b border-slate-100">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                 </div>
                 <img 
                   src="https://i.ibb.co/1YbdN8bj/Captura-de-tela-2026-04-25-082006.png" 
                   alt="Dashboard" 
                   className="w-full h-auto rounded-[2.5rem] mt-10 shadow-sm"
                 />
                 
                 {/* Floating Glass UI Elements */}
                 <motion.div 
                   animate={{ y: [0, -15, 0] }}
                   transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                   className="absolute top-4/6 -right--1 hidden xl:flex flex-col gap-4 p-8 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 max-w-[350px]"
                 >
                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                     <Cpu size={24} />
                   </div>
                   <div className="space-y-2">
                     <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Automação Ativa</p>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">Sincronizando 12 fontes de leads em tempo real.</p>
                   </div>
                 </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof (Updated Position) */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-12">Impulsionando agências de elite</p>
          <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-24 opacity-30 grayscale contrast-125">
            {['Global Media', 'Rocket Design', 'Pixel Perfect', 'Agency Flux'].map(name => (
              <span key={name} className="text-lg font-black tracking-tighter text-slate-900 uppercase">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section (New Integrated Style) */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-24">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center md:items-start group"
              >
                <div className="text-7xl font-black tracking-[-0.05em] text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors">
                  {stat.value}
                </div>
                <div className="h-px w-12 bg-indigo-600 mb-4 self-center md:self-start group-hover:w-20 transition-all duration-500" />
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">{stat.label}</div>
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Refined */}
      <section id="features" className="py-44 px-6 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-32 flex flex-col md:flex-row justify-between items-end gap-12">
            <div className="max-w-3xl">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-6 block">Capabilities</span>
              <h2 className="text-6xl sm:text-8xl font-black text-slate-900 tracking-[-0.04em] mb-10 leading-[0.9]">
                Construído para <br />
                <span className="italic text-indigo-600">performance.</span>
              </h2>
              <p className="text-xl sm:text-2xl text-slate-500 font-medium leading-relaxed tracking-tight">
                Esqueça ferramentas genéricas. Criamos uma infraestrutura robusta que entende a complexidade da rotina de uma agência.
              </p>
            </div>
            <button className="hidden md:flex px-12 py-5 bg-white border border-slate-200 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">Explorar Manual</button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="group p-14 rounded-[3.5rem] bg-white border border-slate-100 hover:border-indigo-600/20 hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.1)] transition-all relative overflow-hidden"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-12 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" style={{ backgroundColor: primaryColor }}>
                  <feature.icon size={26} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium text-lg tracking-tight">{feature.description}</p>
                <div className="mt-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest">
                  Saber mais <ArrowRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="py-44 px-6 bg-white border-y border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-50/30 blur-[120px] -z-10" />
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div>
              <span className="text-[10px] font-black text-indigo-600 tracking-[0.4em] uppercase mb-8 block">O Protocolo</span>
              <h2 className="text-6xl sm:text-8xl font-black tracking-[-0.04em] text-slate-900 mb-10 leading-[0.9]">Ative sua <br /><span className="text-indigo-600">agência em 1h.</span></h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg mb-16">
                Implementação rápida, curva de aprendizado zero e suporte obsessivo pelo seu sucesso.
              </p>
              <div className="flex flex-col gap-10">
                {steps.map((step, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-8 group"
                  >
                    <div className="text-4xl font-black text-indigo-400/20 group-hover:text-indigo-600 transition-colors uppercase italic">{step.number}</div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black tracking-tight text-slate-900">{step.title}</h3>
                       <p className="text-slate-500 font-medium leading-relaxed text-lg max-w-sm">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-50 rounded-[4rem] p-4 shadow-2xl relative overflow-hidden group border border-slate-100">
                 <img 
                    src="https://i.ibb.co/1YbdN8bj/Captura-de-tela-2026-04-25-082006.png" 
                    alt="Workflow" 
                    className="w-full h-full object-cover rounded-[3rem] transition-all duration-700"
                 />
                 <div className="absolute inset-0 bg-indigo-600/5 group-hover:bg-transparent transition-colors" />
                 <div className="absolute bottom-12 left-12 right-12 p-8 bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-2xl">
                    <p className="text-slate-900 font-black text-lg mb-2">"A melhor decisão operacional que já tomamos."</p>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pixel Perfect Agency</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Refined */}
      <section id="pricing" className="py-44 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-32">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 block">Investimento</span>
            <h2 className="text-6xl sm:text-8xl font-black text-slate-900 tracking-[-0.04em] leading-[0.85] mb-12">
              Escolha seu <br /><span className="text-indigo-600">novo patamar.</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {[{
                name: 'Growth Pack',
                price: '197',
                sub: '/mês',
                features: ['Gestão de Leads High-End', 'Workflow Criativo Essencial', '5 Assentos Exclusivos', 'Suporte via Slack']
              },
              {
                name: 'Elite Scale',
                price: '497',
                sub: '/mês',
                features: ['Automação Financeira Total', 'WhatsApp API Direta', 'Assentos Ilimitados', 'Hospedagem Premium Incluída'],
                featured: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                sub: 'SLA Dedicado',
                features: ['Desenvolvimento Sob Medida', 'API de Baixa Latência', 'Gerente de Conta 24/7', 'White Label Total']
              }
            ].map((plan, i) => (
              <div 
                key={i}
                className={cn(
                  "p-16 rounded-[4rem] transition-all duration-500 relative flex flex-col",
                  plan.featured 
                    ? "bg-white shadow-[0_40px_80px_-15px_rgba(79,70,229,0.15)] ring-2 ring-indigo-600/10 scale-105 z-10" 
                    : "bg-white/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-2xl"
                )}
              >
                <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-slate-400">{plan.name}</div>
                
                <div className="mb-14">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black tracking-tighter text-slate-900">
                      {plan.price === 'Custom' ? 'Custom' : `R$ ${plan.price}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2 block text-slate-500">{plan.sub}</span>
                </div>

                <ul className="space-y-6 mb-16 flex-grow">
                  {plan.features.map((feat, f) => (
                    <li key={f} className="flex items-start gap-4 text-sm font-bold tracking-tight text-slate-600">
                      <Zap size={16} className="mt-0.5 text-indigo-600" fill="currentColor" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={onSignup}
                  className={cn(
                    "w-full py-6 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all",
                    plan.featured 
                      ? "bg-indigo-600 text-white shadow-xl hover:shadow-indigo-200" 
                      : "bg-slate-900 text-white hover:bg-indigo-600 translate-y-0 hover:-translate-y-1"
                  )}
                >
                  Confirmar Inscrição
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter mb-4">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Como funciona a implementação?",
                a: "Após o cadastro, você recebe um tour guiado. Em menos de 10 minutos sua agência já pode estar operando no sistema."
              },
              {
                q: "Posso exportar meus dados?",
                a: "Sim, todos os seus dados de leads e financeiros podem ser exportados em CSV ou PDF a qualquer momento."
              },
              {
                q: "Tem suporte em português?",
                a: "Com certeza! Nossa equipe de suporte é 100% brasileira e está disponível via chat e WhatsApp."
              }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                <h4 className="text-lg font-bold text-slate-900 mb-2">{item.q}</h4>
                <p className="text-slate-500 font-medium">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 px-4 sm:px-6">
        <div 
          className="max-w-7xl mx-auto rounded-[4rem] p-12 sm:p-24 text-center text-white relative overflow-hidden shadow-[0_50px_100px_rgba(79,70,229,0.2)]"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 -z-10 opacity-50" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/20 blur-[100px] rounded-full" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-7xl font-black mb-8 leading-[0.9] tracking-tighter">Sua Agência não pode mais esperar.</h2>
            <p className="text-white/80 text-xl font-medium mb-12 leading-relaxed">
              Junte-se à nova geração de agências que operam baseadas em dados e transparência. Pare de apagar incêndios e comece a escalar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={onSignup}
                className="w-full sm:w-auto px-12 py-6 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
              >
                Criar conta grátis
              </button>
              <button className="flex items-center gap-2 text-white/90 font-bold hover:text-white transition-colors">
                Ver planos para agências maiores <ChevronRight size={20} />
              </button>
            </div>
            <p className="mt-12 text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">
              TESTE GRÁTIS POR 14 DIAS • SEM CARTÃO • SUPORTE ESPECIALIZADO
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-20 mb-20 text-center md:text-left">
            <div className="space-y-6">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Zap size={20} fill="currentColor" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">{agencyName}</span>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed">
                A plataforma de gestão definitiva projetada exclusivamente para agências criativas e de marketing.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">Operação</h4>
              <ul className="space-y-4">
                {['Funcionalidades', 'Cases', 'Integrações', 'Desenvolvedores'].map(item => (
                  <li key={item}><a href="#" className="text-slate-400 font-bold hover:text-indigo-600 transition-colors uppercase text-[10px] tracking-widest">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">Suporte</h4>
              <ul className="space-y-4">
                {['Ajuda', 'Contato', 'Privacidade', 'Status'].map(item => (
                  <li key={item}><a href="#" className="text-slate-400 font-bold hover:text-indigo-600 transition-colors uppercase text-[10px] tracking-widest">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-100 text-center flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
              © 2026 {agencyName}. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
               <Globe className="text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer" size={20} />
               <Target className="text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer" size={20} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

