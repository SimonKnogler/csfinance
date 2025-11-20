
import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Trash2, CloudOff, Cloud, ChevronDown, ChevronUp, Loader2, Database, Wand2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { CloudService } from '../services/cloudService';
import { Card, Button, Input } from './UIComponents';
import { CloudConfig } from '../types';

export const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(null);
  const [isEnvManaged, setIsEnvManaged] = useState(false);
  
  // Form State
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  
  const [pasteContent, setPasteContent] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const cfg = CloudService.getConfig();
    setCloudConfig(cfg);
    setIsEnvManaged(CloudService.usesEnvConfig());
    if (cfg) {
        setApiKey(cfg.apiKey);
        setProjectId(cfg.projectId);
        setAuthDomain(cfg.authDomain);
        setStorageBucket(cfg.storageBucket);
        setMessagingSenderId(cfg.messagingSenderId);
        setAppId(cfg.appId);
    }
  }, []);

  const handleAutoParse = () => {
      if (!pasteContent) return;

      // Improved Regex to handle both apiKey: "..." and "apiKey": "..."
      const extract = (key: string) => {
          // Matches key followed by optional quotes, colon, optional space, quote, value, quote
          const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
          const match = pasteContent.match(regex);
          return match ? match[1] : '';
      };

      const newApi = extract('apiKey');
      const newProject = extract('projectId');
      
      if (newApi && newProject) {
          setApiKey(newApi);
          setProjectId(newProject);
          setAuthDomain(extract('authDomain'));
          setStorageBucket(extract('storageBucket'));
          setMessagingSenderId(extract('messagingSenderId'));
          setAppId(extract('appId'));
          // Don't clear paste content immediately so user can verify
      } else {
          alert("Could not find configuration in text. Please ensure you pasted the full 'const firebaseConfig = { ... }' block including the brackets.");
      }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !projectId) {
        alert("Please enter at least API Key and Project ID.");
        return;
    }

    setIsConnecting(true);
    
    const config: CloudConfig = {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        authDomain: (authDomain || `${projectId}.firebaseapp.com`).trim(),
        storageBucket: (storageBucket || `${projectId}.appspot.com`).trim(),
        messagingSenderId: messagingSenderId.trim(),
        appId: appId.trim()
    };

    try {
        const success = await CloudService.testConnection(config);
        if (success) {
            CloudService.saveConfig(config);
            setCloudConfig(config);
            alert("Connection Successful! Your app is now using the Cloud Database. The page will reload.");
            // Short timeout to ensure alert closes before reload
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            alert("Connection Failed. Please check your credentials and ensure your Firebase database is active.");
        }
    } catch (error) {
        console.error("Connection Error:", error);
        alert("An unexpected error occurred during connection. Check console for details.");
    } finally {
        setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Disconnect from Cloud? Your data will revert to Local Storage only.")) {
        CloudService.removeConfig();
        setCloudConfig(null);
    }
  };

  const handleExport = async () => {
    const data = await StorageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financecs_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (await StorageService.importData(content)) {
        alert('Data restored successfully! The app will now reload.');
        window.location.reload();
      } else {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure? This will wipe all your data permanently. This cannot be undone.')) {
      await StorageService.clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
       <div className="mb-8">
         <h2 className="text-2xl font-bold text-white">Settings & Data</h2>
         <p className="text-slate-400">Manage your application data, backups, and cloud connections.</p>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* --- CLOUD CONNECTION --- */}
         <div className="lg:col-span-3">
            <Card className={`border-slate-700 transition-all ${cloudConfig ? 'bg-gradient-to-r from-emerald-900/20 to-slate-900 border-emerald-500/30' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}>
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
                 <div className={`p-4 rounded-full border shadow-xl ${cloudConfig ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {cloudConfig ? <Cloud className="w-8 h-8" /> : <CloudOff className="w-8 h-8" />}
                 </div>
                 <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                       <h3 className="text-lg font-semibold text-white">External Cloud Database</h3>
                       {cloudConfig ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isEnvManaged ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {isEnvManaged ? 'DEPLOYMENT CONFIG' : 'CONNECTED'}
                          </span>
                       ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-400 border border-slate-600">OFFLINE</span>
                       )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                       {cloudConfig 
                         ? isEnvManaged 
                            ? `Connected to project "${cloudConfig.projectId}" via managed configuration. All devices will share this cloud database.`
                            : `Connected to project "${cloudConfig.projectId}". Your data is automatically syncing.`
                         : "Connect a free Google Firebase database to sync your data across all your devices."}
                    </p>
                 </div>
              </div>

              {!cloudConfig ? (
                <div className="bg-black/20 rounded-xl p-6 border border-slate-700/50">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-white flex items-center gap-2"><Database size={16}/> Connect Database</h4>
                      <button onClick={() => setShowGuide(!showGuide)} className="text-xs text-primary hover:text-indigo-400 flex items-center gap-1">
                         {showGuide ? 'Hide Guide' : 'How to find these?'}
                         {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                   </div>

                   {showGuide && (
                      <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-sm text-slate-300 space-y-2">
                         <p className="font-bold text-white mb-2">How to get your credentials:</p>
                         <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                            <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="text-primary underline hover:text-indigo-300">Firebase Console</a>.</li>
                            <li>Open your project (or create one).</li>
                            <li>Click the <strong>Gear Icon</strong> (Project Settings) in the top left sidebar.</li>
                            <li>Scroll down to the <strong>"Your apps"</strong> section.</li>
                            <li>If no app exists, click the <strong>&lt;/&gt;</strong> icon to register a web app.</li>
                            <li>You will see a code block starting with <code>const firebaseConfig = ...</code></li>
                            <li>Copy that entire block and paste it into the box below!</li>
                         </ol>
                      </div>
                   )}

                   {/* AUTO FILLER */}
                   <div className="mb-6 bg-darker p-4 rounded-lg border border-slate-700 border-dashed">
                        <label className="block text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Fast Setup: Paste Config Code</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-primary"
                                placeholder='Paste "const firebaseConfig = { ... }" here...'
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                            />
                            <Button onClick={handleAutoParse} disabled={!pasteContent} className="h-9 text-xs">
                                <Wand2 className="w-3 h-3" /> Auto-Fill
                            </Button>
                        </div>
                   </div>

                   <form onSubmit={handleConnect} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                      <div className="md:col-span-2">
                         <label className="block text-xs text-slate-400 mb-1">API Key</label>
                         <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." required className="text-xs font-mono" />
                      </div>
                      <div>
                         <label className="block text-xs text-slate-400 mb-1">Project ID</label>
                         <Input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="financecs-123" required className="text-xs font-mono" />
                      </div>
                      <div>
                         <label className="block text-xs text-slate-400 mb-1">Sender ID</label>
                         <Input value={messagingSenderId} onChange={e => setMessagingSenderId(e.target.value)} placeholder="123456789" required className="text-xs font-mono" />
                      </div>
                      <div>
                         <label className="block text-xs text-slate-400 mb-1">App ID</label>
                         <Input value={appId} onChange={e => setAppId(e.target.value)} placeholder="1:123456789:web:..." required className="text-xs font-mono" />
                      </div>
                      <div className="flex items-end">
                         <Button type="submit" disabled={isConnecting} className="w-full h-[46px]">
                            {isConnecting ? <Loader2 className="animate-spin" /> : 'Connect Database'}
                         </Button>
                      </div>
                   </form>
                </div>
              ) : (
                 <>
                   {isEnvManaged ? (
                      <div className="mt-6 p-4 rounded-lg bg-slate-900/70 border border-slate-700 text-sm text-slate-300">
                        <p className="font-semibold text-white mb-1">Managed via default configuration</p>
                        <p>To change or disconnect this Firebase project, update the `VITE_FIREBASE_*` environment variables (or edit the built-in config) and redeploy.</p>
                      </div>
                   ) : (
                      <div className="flex justify-end">
                        <Button variant="danger" onClick={handleDisconnect}>Disconnect Database</Button>
                      </div>
                   )}
                 </>
              )}
            </Card>
         </div>

         {/* BACKUP ACTIONS */}
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Manual Backup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                 onClick={handleExport}
                 className="flex flex-col items-start p-6 rounded-xl bg-darker border border-slate-700 hover:border-primary hover:bg-slate-800 transition-all group text-left relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Download size={20} />
                 </div>
                 <h3 className="text-white font-medium text-lg mb-1">Export Backup</h3>
                 <p className="text-xs text-slate-500 leading-relaxed z-10">
                    Download a JSON file containing all your portfolios, transactions, and documents.
                 </p>
              </button>

              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex flex-col items-start p-6 rounded-xl bg-darker border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all group text-left relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
                 <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                 </div>
                 <h3 className="text-white font-medium text-lg mb-1">Restore Data</h3>
                 <p className="text-xs text-slate-500 leading-relaxed z-10">
                    Import a backup file to transfer your data to this device.
                 </p>
                 <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
              </button>
            </div>
         </div>

         {/* DANGER ZONE */}
         <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Danger Zone</h3>
            <Card className="border-red-500/20 bg-red-500/5">
               <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                     <Trash2 size={24} />
                  </div>
                  <h3 className="text-white font-medium">Factory Reset</h3>
                  <p className="text-xs text-slate-400 mt-2 mb-6">
                     Permanently delete all local data. This action cannot be undone.
                  </p>
                  <Button onClick={handleClear} variant="danger" className="w-full">
                     Delete Everything
                  </Button>
               </div>
            </Card>
            
            <div className="text-center mt-8">
                <p className="text-slate-600 text-xs">FinanceCS v2.0.3</p>
                <p className="text-slate-600 text-[10px] mt-1">Engine: Hybrid (IDB + FireStore)</p>
            </div>
         </div>
       </div>
    </div>
  );
};
