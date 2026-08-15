import type { Env, Entitlement, UserRow } from '../types';
import type { TelegramUser } from './telegramAuth';

export async function getOrCreateUser(env: Env, tgUser: TelegramUser): Promise<UserRow> {
  let user = await env.DB.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(tgUser.id).first<UserRow>();
  if (!user) {
    const inserted = await env.DB.prepare(
      'INSERT INTO users (telegram_id, first_name, username) VALUES (?, ?, ?) RETURNING *',
    )
      .bind(tgUser.id, tgUser.first_name ?? '', tgUser.username ?? null)
      .first<UserRow>();
    user = inserted!;
  } else if (tgUser.username && tgUser.username !== user.username) {
    // Telegram usernames can change — keep it fresh on every visit.
    await env.DB.prepare('UPDATE users SET username = ? WHERE id = ?').bind(tgUser.username, user.id).run();
    user.username = tgUser.username;
  }
  return user;
}

/** Free analyses per Telegram account before Stars kick in. */
export const FREE_ANALYSES = 5;

export function entitlementOf(user: UserRow): Entitlement {
  const isPro = !!user.pro_until && new Date(`${user.pro_until.replace(' ', 'T')}Z`) > new Date();
  const freeRemaining = Math.max(0, FREE_ANALYSES - user.free_used);
  return {
    freeRemaining,
    freeTotal: FREE_ANALYSES,
    credits: user.credits,
    isPro,
    proUntil: user.pro_until,
    canAnalyze: freeRemaining > 0 || user.credits > 0 || isPro,
  };
}
