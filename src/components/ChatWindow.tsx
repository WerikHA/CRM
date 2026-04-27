import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Square, Play, Pause, Trash2, X, MessageSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

interface Message {
  id: string;
  chatType: string;
  referenceId?: string;
  senderId: string;
  senderName: string;
  content?: string;
  audioUrl?: string;
  createdAt: string;
}

interface ChatWindowProps {
  chatType: 'team' | 'task' | 'feedback';
  referenceId?: string;
  senderId: string;
  senderName: string;
  ownerId: string;
  title?: string;
  onClose?: () => void;
}

export function ChatWindow({ chatType, referenceId, senderId, senderName, ownerId, title, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [chatType, referenceId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const allMessages = await api.get('/chat-messages');
      if (!Array.isArray(allMessages)) {
        setMessages([]);
        return;
      }
      
      const filtered = (allMessages as Message[]).filter(m => 
        m.chatType === chatType && 
        (chatType === 'team' || m.referenceId === referenceId)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setMessages(filtered);
    } catch (err) {
      console.error("Falha ao carregar mensagens:", err);
    }
  };

  const sendMessage = async (text?: string, audioBase64?: string) => {
    if (!text && !audioBase64) return;
    
    setIsLoading(true);
    try {
      const newMessage = {
        chatType,
        referenceId,
        senderId,
        senderName,
        content: text,
        audioUrl: audioBase64,
        ownerId,
        createdAt: new Date().toISOString()
      };

      await api.post('/chat-messages', newMessage);
      setInputText('');
      loadMessages();
    } catch (err) {
      console.error("Falha ao enviar mensagem:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendMessage(undefined, base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Permissão do microfone negada. Por favor, verifique as configurações do seu navegador.");
      } else {
        alert("Não foi possível acessar o microfone. Certifique-se de que ele está conectado e não está sendo usado por outro aplicativo.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MessageSquare size={20} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-sm">
                    {title || (chatType === 'team' ? 'Chat da Equipe' : 'Discussão da Tarefa')}
                </h3>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Online agora
                </p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <X size={20} className="text-gray-500" />
            </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/50"
      >
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-8">
                <MessageSquare size={40} className="mb-4" />
                <p className="text-sm font-medium">Nenhuma mensagem ainda.<br/>Inicie a conversa!</p>
            </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.senderId === senderId ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{msg.senderName}</span>
                <span className="text-[9px] text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            <div className={`
              max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm
              ${msg.senderId === senderId 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-800 rounded-tl-none'}
            `}>
              {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
              
              {msg.audioUrl && (
                <div className="mt-1 min-w-[200px]">
                    <audio controls className="w-full h-8 opacity-90 brightness-110">
                        <source src={msg.audioUrl} type="audio/webm" />
                    </audio>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
            {!isRecording ? (
                <>
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
                      placeholder="Escreva sua mensagem..."
                      className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                    
                    <button 
                      onClick={startRecording}
                      className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl transition-all"
                    >
                      <Mic size={20} />
                    </button>
                    
                    <button 
                      onClick={() => sendMessage(inputText)}
                      disabled={!inputText.trim() || isLoading}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Send size={20} />
                    </button>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-between bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                            Gravando: {formatDuration(recordingDuration)}
                        </span>
                    </div>
                    <button 
                      onClick={stopRecording}
                      className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all"
                    >
                      <Square size={16} fill="currentColor" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
