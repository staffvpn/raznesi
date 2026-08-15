/**
 * Thin wrapper around the raw Telegram WebApp bridge (telegram-web-app.js).
 * Everything is defensive: the app must run fine as a plain browser preview
 * too (no Telegram object present), which is how we develop/QA it.
 */

export function getTelegram() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

export const isInTelegram = () => Boolean(getTelegram()?.initData);

/** Call once, as early as possible (main.tsx). Every bridge call is wrapped
 *  individually — a Direct Link Mini App (opened via t.me/bot/shortname, as
 *  opposed to a menu-button/inline-button launch) has a thinner WebApp
 *  bridge in some Telegram clients, and one unsupported method throwing
 *  here used to be able to abort the whole script before React ever
 *  mounted, i.e. a blank/black screen with no error visible to the user. */
export function bootstrapTelegram() {
  const tg = getTelegram();
  if (!tg) return;

  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* unsupported in this client — app still has to render */
    }
  };

  safe(() => tg.ready());
  safe(() => tg.expand());
  safe(() => tg.requestFullscreen?.());
  safe(() => tg.disableVerticalSwipes?.());
  safe(() => tg.setHeaderColor?.('#0b0a12'));
  safe(() => tg.setBackgroundColor?.('#0b0a12'));
  safe(() => tg.setBottomBarColor?.('#0b0a12'));
  safe(() => tg.enableClosingConfirmation());

  safe(() => {
    const syncSafeArea = () => {
      const top = (tg.safeAreaInset?.top ?? 0) + (tg.contentSafeAreaInset?.top ?? 0);
      const bottom = (tg.safeAreaInset?.bottom ?? 0) + (tg.contentSafeAreaInset?.bottom ?? 0);
      document.documentElement.style.setProperty('--tg-safe-top', `${top}px`);
      document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
    };
    syncSafeArea();
    tg.onEvent('safeAreaChanged', syncSafeArea);
    tg.onEvent('contentSafeAreaChanged', syncSafeArea);
    tg.onEvent('fullscreenChanged', syncSafeArea);
  });
}

export function haptic(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
  getTelegram()?.HapticFeedback.impactOccurred(style);
}

export function hapticNotify(type: 'error' | 'success' | 'warning') {
  getTelegram()?.HapticFeedback.notificationOccurred(type);
}

export function hapticSelect() {
  getTelegram()?.HapticFeedback.selectionChanged();
}

export function getTelegramUser() {
  return getTelegram()?.initDataUnsafe.user;
}

export function getInitData(): string {
  return getTelegram()?.initData ?? '';
}

export function tgBackButton(onBack: (() => void) | null) {
  const tg = getTelegram();
  if (!tg) return;
  if (!onBack) {
    tg.BackButton.hide();
    return;
  }
  tg.BackButton.show();
  tg.BackButton.onClick(onBack);
  return () => {
    tg.BackButton.offClick(onBack);
  };
}

/** Opens a Telegram Stars invoice link and resolves once the flow settles.
 *  Falls back to opening the link in a browser tab outside Telegram (dev
 *  preview) — it just won't be payable there. */
export function openInvoice(link: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'> {
  const tg = getTelegram();
  if (!tg) {
    window.open(link, '_blank');
    return Promise.resolve('pending');
  }
  return new Promise((resolve) => {
    tg.openInvoice(link, (status) => resolve(status));
  });
}
