import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { Client, ClientDocument } from '../types';
import { api } from '../services/api';
import { cn, notifyError } from '../lib/utils';

interface ClientDocumentsManagerProps {
  client: Client;
}

export default function ClientDocumentsManager({ client }: ClientDocumentsManagerProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [client.id]);

  const loadDocuments = async () => {
    try {
      const data = await api.listClientDocuments(client.id);
      setDocuments(data);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real app, we would upload to storage (Supabase Bucket or Drive)
      // Here we'll simulate by creating a record with a fake URL or data URI
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newDoc = await api.createClientDocument({
          clientId: client.id,
          name: file.name,
          url: base64, // Real app: URL from storage
          fileType: file.type,
          source: 'local'
        });
        setDocuments([...documents, newDoc]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      notifyError('Erro ao fazer upload');
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    try {
      await api.deleteClientDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      notifyError('Erro ao excluir documento');
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Documentos e Contratos</h3>
        <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 transition-colors">
          <Upload size={14} />
          {isUploading ? 'Enviando...' : 'Fazer Upload'}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{doc.name}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">{doc.source === 'google_drive' ? 'Google Drive' : 'Upload Local'} • {new Date(doc.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-indigo-500"
              >
                <ExternalLink size={14} />
              </a>
              <button 
                onClick={() => handleDelete(doc.id)}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-gray-400 hover:text-rose-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum documento anexado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
