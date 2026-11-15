import React, { useState } from 'react';
import { Lock, KeyRound, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { verifyPasscode } from '../utils/auth';

interface AuthGateProps {
  onSuccess: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    setIsLoading(true);
    setError(false);

    try {
      const ok = await verifyPasscode(passcode);
      if (ok) {
        onSuccess();
      } else {
        setError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0c0e14] text-slate-100">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-white/10 shadow-2xl space-y-6 text-center">
        {/* App Logo & Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-sky-500/30">
          <Lock size={30} />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Voice Morph Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            個人用プライベートアクセス認証
          </p>
        </div>

        <div className="bg-sky-950/40 border border-sky-800/50 p-3.5 rounded-xl text-xs text-sky-300 text-left space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>プライベートアクセス</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            このアプリはアクセスが制限されています。設定されたパスコードを入力してログインしてください。
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs text-slate-400 font-medium block">
              パスコード
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(false);
                }}
                placeholder="パスコードを入力"
                autoFocus
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors font-mono"
              />
              <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs justify-center font-medium bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">
              <AlertCircle size={14} />
              <span>パスコードが正しくありません</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !passcode}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 hover:opacity-95 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>{isLoading ? '認証中...' : 'ロック解除'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="text-[11px] text-slate-600">
          一度解除すると、このブラウザ上でログイン状態が維持されます。
        </p>
      </div>
    </div>
  );
};
