import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Users, Sparkles, Crown, Star, RotateCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MODES } from '@/data/modes';
import { adminFetch, AdminApiError, ADMIN_KEY_STORAGE } from '@/lib/adminApi';
import { formatDate, truncate } from '@/lib/format';
import type { AdminAnalysisItem, AdminStats } from '@/types';

const MODE_COLOR: Record<string, string> = {
  praise: '#34d17c',
  criticize: '#f5a623',
  destroy: '#ef4d5e',
  monetize: '#fbbf24',
};

/** Standalone admin dashboard — meant to be opened as a normal webpage
 *  (https://raznesi.pages.dev/#/admin), not inside Telegram. Auth is a
 *  single shared password (ADMIN_KEY on the worker), stored in
 *  localStorage after first entry so it doesn't have to be retyped. */
export function Admin() {
  const [key, setKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) ?? '');
  const [keyInput, setKeyInput] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<AdminAnalysisItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(activeKey: string) {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, itemsRes] = await Promise.all([
        adminFetch<AdminStats>('/admin/stats', activeKey),
        adminFetch<{ items: AdminAnalysisItem[] }>('/admin/analyses?limit=100', activeKey),
      ]);
      setStats(statsRes);
      setItems(itemsRes.items);
      localStorage.setItem(ADMIN_KEY_STORAGE, activeKey);
      setKey(activeKey);
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 403) {
        setError('Неверный пароль');
        localStorage.removeItem(ADMIN_KEY_STORAGE);
        setKey('');
      } else {
        setError('Не удалось загрузить данные');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!key) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 gap-4 text-center safe-top safe-bottom">
        <div className="h-12 w-12 rounded-2xl bg-accent-soft flex items-center justify-center text-accent">
          <Lock size={20} />
        </div>
        <h1 className="font-bold text-[17px]">Админка</h1>
        <form
          className="w-full max-w-[280px] flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (keyInput) load(keyInput);
          }}
        >
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Пароль (ADMIN_KEY)"
            className="w-full h-11 px-4 rounded-2xl bg-surface border border-border text-[15px] outline-none focus:border-accent"
            autoFocus
          />
          <Button type="submit" fullWidth disabled={!keyInput || loading}>
            {loading ? 'Проверяю…' : 'Войти'}
          </Button>
          {error && <p className="text-danger text-[13px]">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-5 pt-3 pb-2 safe-top shrink-0">
        <p className="font-bold text-[16px]">Админка</p>
        <button
          type="button"
          onClick={() => load(key)}
          className="h-9 w-9 rounded-full bg-surface-2 border border-border-soft flex items-center justify-center text-text-muted active:bg-surface-hover"
          aria-label="Обновить"
        >
          <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 safe-bottom">
        {error && <p className="text-danger text-[13px] mb-3">{error}</p>}

        {stats && (
          <>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <StatTile icon={<Users size={15} />} label="Пользователей" value={stats.users} />
              <StatTile icon={<Sparkles size={15} />} label="Разборов" value={stats.analyses} />
              <StatTile icon={<Crown size={15} />} label="Pro сейчас" value={stats.proUsers} />
            </div>

            <Card className="p-4 mb-3">
              <p className="font-bold text-[14px] mb-3">Режимы</p>
              <div className="space-y-2">
                {stats.modeBreakdown.map((m) => (
                  <div key={m.mode} className="flex items-center justify-between text-[13px]">
                    <span className="text-text-muted">
                      {MODES[m.mode]?.emoji} {MODES[m.mode]?.label ?? m.mode}
                    </span>
                    <span className="font-bold">{m.n}</span>
                  </div>
                ))}
                {stats.modeBreakdown.length === 0 && <p className="text-text-faint text-[13px]">Пока пусто</p>}
              </div>
            </Card>

            <Card className="p-4 mb-5">
              <p className="font-bold text-[14px] mb-3">Оплаты</p>
              <div className="space-y-2">
                {stats.revenue.map((r) => (
                  <div key={r.kind} className="flex items-center justify-between text-[13px]">
                    <span className="text-text-muted">
                      {r.kind === 'pro' ? 'Pro' : 'Разовые разборы'} · {r.n} шт
                    </span>
                    <span className="font-bold flex items-center gap-1">
                      <Star size={12} className="text-monetize" fill="currentColor" />
                      {r.stars}
                    </span>
                  </div>
                ))}
                {stats.revenue.length === 0 && <p className="text-text-faint text-[13px]">Пока пусто</p>}
              </div>
            </Card>
          </>
        )}

        <p className="text-[12px] font-bold text-text-faint uppercase tracking-wide mb-2 px-0.5">Последние идеи</p>
        <div className="space-y-2.5">
          {items?.map((item) => {
            const color = MODE_COLOR[item.mode];
            return (
              <Card key={item.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[13px] font-semibold" style={{ color }}>
                    {MODES[item.mode]?.emoji} {MODES[item.mode]?.label}
                  </span>
                  <span className="text-[11px] text-text-faint shrink-0">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-[14px] leading-snug mb-1.5">{item.ideaText}</p>
                <p className="text-[12px] text-text-faint truncate">{truncate(item.verdict, 80)}</p>
                <p className="text-[11px] text-text-faint mt-1.5">
                  {item.user.name} {item.user.username ? `· @${item.user.username}` : ''} · оценка {item.score}
                </p>
              </Card>
            );
          })}
          {items && items.length === 0 && <p className="text-text-faint text-[13px]">Пока нет ни одного разбора</p>}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3 flex flex-col gap-1.5">
      <div className="text-accent">{icon}</div>
      <span className="text-[20px] font-extrabold leading-none">{value}</span>
      <span className="text-[11px] text-text-faint leading-tight">{label}</span>
    </Card>
  );
}
