import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, File, Info } from 'lucide-react';
import { PortfolioDocument } from '../types';
import { Card, Button, Badge } from './UIComponents';

interface DocumentsProps {
  docs: PortfolioDocument[];
  onAddDoc: (doc: PortfolioDocument) => void;
  onDeleteDoc: (id: string) => void;
}

export const Documents: React.FC<DocumentsProps> = ({ docs, onAddDoc, onDeleteDoc }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      
      const newDoc: PortfolioDocument = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        type: file.type.includes('pdf') ? 'PDF' : 'IMG',
        date: new Date().toISOString().split('T')[0],
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        category: 'Other', // Default category
        data: base64Data // Storing in memory
      };
      onAddDoc(newDoc);
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm mb-6">
         <Info className="w-5 h-5 flex-shrink-0" />
         <p>
           <strong>Session Storage Note:</strong> Files uploaded here are stored securely in your browser's memory. 
           They will be available for viewing and downloading as long as this tab remains open. 
           Refreshing the page will clear the document list.
         </p>
       </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Important Documents</h2>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4" /> Upload Document
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
                     {doc.data && (
                       <a 
                         href={doc.data} 
                         download={doc.name}
                         className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                         title="Download"
                       >
                         <Download size={16} />
                       </a>
                     )}
                     <button 
                       onClick={() => onDeleteDoc(doc.id)}
                       className="p-2 hover:bg-red-500/10 rounded-md text-slate-400 hover:text-red-400 transition-colors"
                       title="Delete"
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