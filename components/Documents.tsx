import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, File, Info, Cloud, Loader2, CheckCircle } from 'lucide-react';
import { PortfolioDocument } from '../types';
import { Card, Button, Badge } from './UIComponents';
import { CloudService } from '../services/cloudService';

interface DocumentsProps {
  docs: PortfolioDocument[];
  onAddDoc: (doc: PortfolioDocument) => void;
  onDeleteDoc: (id: string, storagePath?: string) => void;
}

export const Documents: React.FC<DocumentsProps> = ({ docs, onAddDoc, onDeleteDoc }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Datei wird verarbeitet...');

    const docId = Date.now().toString();
    const storagePath = `documents/${docId}_${file.name}`;
    
    // Try Firebase Storage first
    const hasCloud = CloudService.getConfig() !== null;
    let fileUrl: string | null = null;
    
    if (hasCloud) {
      setUploadProgress('Hochladen in die Cloud...');
      fileUrl = await CloudService.uploadFile(file, storagePath);
    }

    // Fallback to base64 if cloud upload fails or not available
    let base64Data: string | undefined = undefined;
    if (!fileUrl) {
      setUploadProgress('Lokale Speicherung...');
      base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }
      
      const newDoc: PortfolioDocument = {
      id: docId,
        name: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'IMG',
        date: new Date().toISOString().split('T')[0],
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      category: 'Other',
      data: base64Data,
      fileUrl: fileUrl || undefined,
      storagePath: fileUrl ? storagePath : undefined,
      };
    
      onAddDoc(newDoc);
    setIsUploading(false);
    setUploadProgress(null);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const hasCloudStorage = CloudService.getConfig() !== null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className={`flex items-center gap-3 p-4 rounded-lg ${hasCloudStorage ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-blue-500/10 border border-blue-500/20 text-blue-200'} text-sm mb-6`}>
         {hasCloudStorage ? <Cloud className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
         <p>
           {hasCloudStorage ? (
             <>
               <strong>Cloud Storage aktiv:</strong> Dateien werden sicher in Firebase Storage gespeichert und sind von allen Geräten aus zugänglich.
             </>
           ) : (
             <>
               <strong>Lokale Speicherung:</strong> Dateien werden im Browser gespeichert. Für Cloud-Sync, verbinde Firebase in den Einstellungen.
             </>
           )}
         </p>
       </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Wichtige Dokumente</h2>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}</>
          ) : (
            <><Upload className="w-4 h-4" /> Dokument hochladen</>
          )}
        </Button>
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          accept=".pdf,.png,.jpg,.jpeg" 
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* DRAG DROP ZONE */}
      <div 
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer ${dragActive ? 'border-primary bg-primary/10' : 'border-slate-700 hover:border-primary/50 hover:bg-slate-800/50'}`}
        onDragEnter={onDrag} 
        onDragLeave={onDrag} 
        onDragOver={onDrag} 
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 pointer-events-none">
           <Upload className={`w-8 h-8 ${dragActive ? 'text-primary' : 'text-slate-300'}`} />
        </div>
        <p className="text-lg font-medium text-slate-200 mb-1 pointer-events-none">Click or Drag to Upload</p>
        <p className="text-sm pointer-events-none">Support for PDF, JPG, PNG (Max 10MB)</p>
      </div>

      {/* DOC LIST */}
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
            <tr>
              <th className="p-4 pl-6">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Date Added</th>
              <th className="p-4">Size</th>
              <th className="p-4 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No documents uploaded yet.
                </td>
              </tr>
            )}
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <span className="font-medium text-white">{doc.name}</span>
                  </div>
                </td>
                <td className="p-4"><Badge>{doc.category}</Badge></td>
                <td className="p-4 text-slate-400">{doc.date}</td>
                <td className="p-4 text-slate-400">{doc.size}</td>
                <td className="p-4 text-right pr-6">
                   <div className="flex items-center justify-end gap-2">
                     {/* Cloud indicator */}
                     {doc.fileUrl && (
                       <span className="text-emerald-400" title="In Cloud gespeichert">
                         <Cloud size={14} />
                       </span>
                     )}
                     {/* Download button */}
                     {(doc.data || doc.fileUrl) && (
                       <a 
                         href={doc.fileUrl || doc.data} 
                         download={doc.fileUrl ? undefined : doc.name}
                         target={doc.fileUrl ? '_blank' : undefined}
                         rel={doc.fileUrl ? 'noopener noreferrer' : undefined}
                         className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                         title="Download"
                       >
                         <Download size={16} />
                       </a>
                     )}
                     <button 
                       onClick={() => onDeleteDoc(doc.id, doc.storagePath)}
                       className="p-2 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                       title="Löschen"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}