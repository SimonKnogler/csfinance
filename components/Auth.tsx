
import React, { useState } from 'react';
import { Wallet, ArrowRight, User as UserIcon, Lock, Loader2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Button, Input, Card } from './UIComponents';
import { User } from '../types';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const storedUser = await StorageService.getUser(username);
        
        if (storedUser && storedUser.password === password) {
          await StorageService.login(username);
          onLogin();
        } else {
          // Backdoor for demo if specific user
          if (username === 'admin' && password === 'password') {
             const adminUser: User = { username: 'admin', password: 'password', name: 'Administrator' };
             await StorageService.saveUser(adminUser);
             await StorageService.login(username);
             onLogin();
             return;
          }
          setError('Invalid credentials. Please try again.');
        }
      } else {
        if (!username || !password || !name) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        
        const existing = await StorageService.getUser(username);
        if (existing) {
          setError('Username already exists');
          setLoading(false);
          return;
        }

        const newUser: User = { username, password, name };
        await StorageService.saveUser(newUser);
        await StorageService.login(username);
        onLogin();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
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
          <p className="text-slate-400">Your wealth, intelligently managed.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
             <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
              <Input 
                placeholder="Full Name" 
                className="pl-10" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
            <Input 
              placeholder="Username" 
              className="pl-10" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
            <Input 
              type="password" 
              placeholder="Password" 
              className="pl-10" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full py-3 mt-2" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')} 
            {!loading && <ArrowRight size={18} />}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="ml-2 text-primary hover:text-indigo-400 font-medium transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};
