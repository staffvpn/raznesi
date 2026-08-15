import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PaywallSheet } from './components/PaywallSheet';
import { Home } from './screens/Home';
import { Result, HistoryDetailScreen } from './screens/Result';
import { History } from './screens/History';

export default function App() {
  return (
    <HashRouter>
      <div className="relative flex flex-col h-full min-h-0">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/result" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<HistoryDetailScreen />} />

            {/* Telegram appends its own bridge data to the URL hash on
                every launch (#tgWebAppData=...&tgWebAppVersion=...) — since
                routing here is also hash-based, that lands as an unmatched
                path on first load unless something catches it. Without this
                the whole app rendered nothing at all inside Telegram (it
                showed fine as a plain page precisely because a browser
                never adds that hash junk). */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <PaywallSheet />
        </ErrorBoundary>
      </div>
    </HashRouter>
  );
}
