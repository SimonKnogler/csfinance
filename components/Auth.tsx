
import React, { useState } from 'react';
import { Wallet, ArrowRight, User as UserIcon, Lock, Loader2, ShieldAlert } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { CloudService } from '../services/cloudService';
import { Button, Input, Card } from './UIComponents';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate credentials against Firebase only
      const result = await CloudService.validateUser(username, password);
      
      if (result.valid && result.user) {
        // Save user locally for session
        await StorageService.saveUser(result.user);
        await StorageService.login(username);
        onLogin();
      } else {
        setError('Ungültige Anmeldedaten. Zugriff verweigert.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Authentifizierung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-darker relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
      </div>

      <Card className="w-full max-w-md z-10 border-slate-800 shadow-2xl shadow-black/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FinanceCS</h1>
          <p className="text-slate-400">Private Vermögensverwaltung</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
            <Input 
              placeholder="Benutzername" 
              className="pl-10" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
            <Input 
              type="password" 
              placeholder="Passwort" 
              className="pl-10" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 mt-2" disabled={loading || !username || !password}>
            {loading ? <Loader2 className="animate-spin" /> : 'Anmelden'} 
            {!loading && <ArrowRight size={18} />}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs">
            Zugang nur für autorisierte Benutzer.
          </p>
        </div>
      </Card>
    </div>
  );
};
