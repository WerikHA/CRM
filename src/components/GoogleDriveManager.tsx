import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { storageService } from '../lib/storage';
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Share2, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  LogOut, 
  ExternalLink,
  Plus,
  ArrowLeft,
  X,
  FileText,
  FileImage,
  Video,
  FileQuestion,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  size?: string;
  modifiedTime: string;
}

const GoogleDriveManager: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadFiles(currentFolder);
    }
  }, [isConnected, currentFolder]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
        setIsConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkStatus = async () => {
    try {
      const data = await api.get('/google/status');
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Error checking Drive status:', error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    try {
      const data = await api.get('/google/auth-url');
      if (data && data.url) {
        window.open(data.url, 'google_auth', 'width=600,height=600');
      } else {
        alert("Erro ao gerar link de autenticação com o Google. As variáveis de ambiente estão configuradas?");
      }
    } catch (error) {
      alert('Erro ao iniciar conexão com Google Drive');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta do Google Drive?')) return;
    try {
      await api.post('/google/disconnect', {});
      setIsConnected(false);
      setFiles([]);
    } catch (error) {
      alert('Erro ao desconectar');
    }
  };

  const loadFiles = async (folderId: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/google/files?folderId=${folderId}`);
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (id: string, name: string) => {
    setCurrentFolder(id);
    setFolderPath(prev => [...prev, { id, name }]);
  };

  const navigateBack = () => {
    if (folderPath.length === 0) return;
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : 'root');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolder);

    try {
      const token = storageService.getItem('agency_token');
      const response = await fetch('/api/google/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        loadFiles(currentFolder);
      } else {
        alert('Erro ao subir arquivo');
      }
    } catch (error) {
      alert('Erro na conexão para upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShare = async (fileId: string) => {
    try {
      const data = await api.post('/google/share-link', { fileId });
      const shareLink = data.link || data.url;
      if (shareLink) {
        navigator.clipboard.writeText(shareLink);
        alert('Link de compartilhamento copiado!');
      } else {
        alert('Erro ao gerar link. Link não retornado.');
      }
    } catch (error) {
      alert('Erro ao gerar link');
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const token = storageService.getItem('agency_token');
      const response = await fetch(`/api/google/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Erro no download");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erro ao baixar arquivo');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="text-amber-400" size={20} />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-400" size={20} />;
    if (mimeType.includes('image')) return <FileImage className="text-blue-400" size={20} />;
    if (mimeType.includes('video')) return <Video className="text-purple-400" size={20} />;
    if (mimeType.includes('document') || mimeType.includes('google-apps.document')) return <FileText className="text-blue-500" size={20} />;
    return <FileQuestion className="text-gray-400" size={20} />;
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '--';
    const s = parseInt(bytes);
    if (s < 1024) return s + ' B';
    if (s < 1024 * 1024) return (s / 1024).toFixed(1) + ' KB';
    return (s / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isConnected === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 max-w-2xl mx-auto mt-20">
        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Folder className="text-indigo-600" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Conecte seu Google Drive</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Acesse seus arquivos, suba materiais de clientes e compartilhe links diretamente pelo CRM. Sua conexão é individual e segura.
        </p>
        <button 
          onClick={handleConnect}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
        >
          <ExternalLink size={20} />
          Conectar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-4">
          {folderPath.length > 0 && (
            <button 
              onClick={navigateBack}
              className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Folder className="text-indigo-600" size={20} />
              Google Drive
            </h2>
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              <span>Drive Pessoal</span>
              {folderPath.map((p, i) => (
                <React.Fragment key={p.id}>
                  <ChevronRight size={12} className="mx-1" />
                  <span className="truncate max-w-[100px]">{p.name}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => loadFiles(currentFolder)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all"
          >
            <RefreshCw className={cn(loading && "animate-spin")} size={20} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
          >
            {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
            Upload
          </button>
          <button 
            onClick={handleDisconnect}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
            title="Desconectar"
          >
            <LogOut size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
          />
        </div>
      </div>

      {/* Grid/List area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RefreshCw className="animate-spin text-indigo-600" size={32} />
            <p className="text-gray-500 text-sm">Carregando seus arquivos...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-gray-50 p-6 rounded-full mb-4">
              <Search className="text-gray-300" size={40} />
            </div>
            <h3 className="text-gray-900 font-semibold">Nenhum arquivo encontrado</h3>
            <p className="text-gray-500 text-sm">Tente mudar sua busca ou faça o upload de um arquivo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={file.id}
                className={cn(
                  "group bg-white border border-gray-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative",
                  file.mimeType === 'application/vnd.google-apps.folder' ? "bg-amber-50/10" : ""
                )}
                onClick={() => {
                  if (file.mimeType === 'application/vnd.google-apps.folder') {
                    handleFolderClick(file.id, file.name);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(file.webViewLink, '_blank');
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink size={14} />
                    </button>
                    {file.mimeType !== 'application/vnd.google-apps.folder' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id, file.name);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Baixar"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(file.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Copiar Link"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 truncate mb-1" title={file.name}>
                  {file.name}
                </h3>
                
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{formatSize(file.size)}</span>
                  <span>{new Date(file.modifiedTime).toLocaleDateString('pt-BR')}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer bar hint */}
      <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400">
          * Arquivos são gerenciados diretamente no seu Google Drive pessoal.
        </p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Google Drive Sync Ativo</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveManager;
