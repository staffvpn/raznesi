import { Hono } from 'hono';
import type { Env, Mode } from '../types';

export const adminRoutes = new Hono<{ Bindings: Env }>();

/** Plain shared-password check, not a real session — good enough for a
 *  single-owner read-only dashboard opened as a normal webpage (not inside
 *  Telegram, so there's no initData to verify against here anyway). */
adminRoutes.use('*', async (c, next) => {
  const key = c.req.header('X-Admin-Key');
  if (!c.env.ADMIN_KEY || key !== c.env.ADMIN_KEY) return c.json({ error: 'forbidden' }, 403);
  await next();
});

interface CountRow {
  n: number;
}
interface ModeCountRow {
  mode: Mode;
  n: number;
}
interface RevenueRow {
  kind: string;
  n: number;
  stars: number;
}

adminRoutes.get('/stats', async (c) => {
  const [users, analyses, proUsers, modeBreakdown, revenue] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<CountRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM analyses').first<CountRow>(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE pro_until IS NOT NULL AND pro_until > datetime('now')").first<CountRow>(),
    c.env.DB.prepare('SELECT mode, COUNT(*) as n FROM analyses GROUP BY mode ORDER BY n DESC').all<ModeCountRow>(),
    c.env.DB.prepare('SELECT kind, COUNT(*) as n, COALESCE(SUM(stars_amount), 0) as stars FROM payments GROUP BY kind').all<RevenueRow>(),
  ]);

  return c.json({
    users: users?.n ?? 0,
    analyses: analyses?.n ?? 0,
    proUsers: proUsers?.n ?? 0,
    modeBreakdown: modeBreakdown.results,
    revenue: revenue.results,
  });
});

interface AnalysisRow {
  id: number;
  idea_text: string;
  mode: Mode;
  verdict: string;
  score: number;
  created_at: string;
  first_name: string;
  username: string | null;
  telegram_id: number;
}

adminRoutes.get('/analyses', async (c) => {
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit') ?? 50) || 50));
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.idea_text, a.mode, a.verdict, a.score, a.created_at,
            u.first_name, u.username, u.telegram_id
     FROM analyses a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<AnalysisRow>();

  return c.json({
    items: results.map((r) => ({
      id: r.id,
      ideaText: r.idea_text,
      mode: r.mode,
      verdict: r.verdict,
      score: r.score,
      createdAt: r.created_at,
      user: { name: r.first_name, username: r.username, telegramId: r.telegram_id },
    })),
  });
});
