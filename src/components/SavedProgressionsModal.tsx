import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  Upload, 
  Download, 
  Play, 
  Clock, 
  FolderHeart,
  Check
} from 'lucide-react';
import { 
  getSavedProgressions, 
  saveProgressionToStorage, 
  deleteSavedProgression, 
  exportProgressionToJson, 
  parseProgressionFromJson,
  type SavedProgressionItem 
} from '../utils/progressionStorage';
import type { SavedChord } from './ProgressionStrip';

interface SavedProgressionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProgression: SavedChord[];
  currentBpm: number;
  currentPatternId: string;
  onLoadProgression: (item: SavedProgressionItem) => void;
}

export const SavedProgressionsModal: React.FC<SavedProgressionsModalProps> = ({
  isOpen,
  onClose,
  currentProgression,
  currentBpm,
  currentPatternId,
  onLoadProgression,
}) => {
  const [items, setItems] = useState<SavedProgressionItem[]>([]);
  const [saveName, setSaveName] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshList = () => {
    setItems(getSavedProgressions());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      const defaultName = `進行 ${new Date().toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      setSaveName(defaultName);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveCurrent = () => {
    if (currentProgression.length === 0) {
      alert('保存するコードが進行にありません。');
      return;
    }
    const saved = saveProgressionToStorage(saveName, currentProgression, currentBpm, currentPatternId);
    refreshList();
    showNotification(`「${saved.name}」を保存しました！`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`「${name}」を削除してもよろしいですか？`)) {
      const updated = deleteSavedProgression(id);
      setItems(updated);
      showNotification(`「${name}」を削除しました`);
    }
  };

  const handleExportJson = (item: SavedProgressionItem) => {
    exportProgressionToJson(item);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const parsed = parseProgressionFromJson(content);
      if (parsed && Array.isArray(parsed.chords) && parsed.chords.length > 0) {
        const newItem = saveProgressionToStorage(
          parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          parsed.chords,
          parsed.bpm || 85,
          parsed.patternId || 'pop_ballad_arp'
        );
        refreshList();
        showNotification(`ファイルから「${newItem.name}」を読み込んで保存しました！`);
      } else {
        alert('有効なコード進行JSONファイルではありませんでした。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <FolderHeart size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                進行ライブラリ (サーバーレス保存)
              </h3>
              <p className="text-xs text-slate-400">
                お気に入りの進行をブラウザ内(localStorage)に無期限保存＆JSONファイルでバックアップ可能
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-teal-500/20 border-b border-teal-500/30 px-4 py-2 text-xs text-teal-300 flex items-center gap-2">
            <Check size={14} />
            <span>{notification}</span>
          </div>
        )}

        {/* Save Current Progression Section */}
        <div className="p-4 bg-black/30 border-b border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Bookmark size={14} className="text-amber-400" />
              現在の進行を保存する
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentProgression.length} コード / {currentBpm} BPM
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="進行の名前（例: 夏のエモ進行、浮遊アンビエント）"
              className="flex-1 min-h-[44px] bg-slate-800 border border-white/10 rounded-xl px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
            <button
              onClick={handleSaveCurrent}
              disabled={currentProgression.length === 0}
              className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Bookmark size={15} />
              <span>保存する</span>
            </button>
          </div>
        </div>

        {/* JSON Import/Export Actions */}
        <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-400">ファイルでの保存・共有:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-medium active:scale-95"
            >
              <Upload size={13} />
              <span>JSONを読み込む</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Saved List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs sm:text-sm space-y-1">
              <FolderHeart size={36} className="mx-auto text-slate-600 mb-2 opacity-50" />
              <p>保存された進行はまだありません。</p>
              <p className="text-slate-600">
                上のフォームから現在の進行を保存するか、JSONファイルをインポートできます。
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-3.5 sm:p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {item.chords.length} コード
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono">
                      {item.bpm} BPM
                    </span>
                  </div>

                  {/* Chord sequence preview tags */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {item.chords.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded bg-black/40 text-teal-300 font-mono border border-white/5"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock size={11} />
                    <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()} に保存</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleExportJson(item)}
                    title="JSONファイルとしてダウンロード"
                    className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 active:scale-95"
                  >
                    <Download size={14} />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    title="この進行を削除"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-colors active:scale-95"
                  >
                    <Trash2 size={15} />
                  </button>

                  <button
                    onClick={() => {
                      onLoadProgression(item);
                      onClose();
                    }}
                    className="min-h-[40px] px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>読み込む</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <span>※ ブラウザのキャッシュをクリアしても残したい場合はJSON書き出しをご利用ください。</span>
          <button
            onClick={onClose}
            className="min-h-[38px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
