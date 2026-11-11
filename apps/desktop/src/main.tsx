import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient.ts'
import { ToastProvider } from './components/ui/ToastProvider.tsx'
import { ConfirmProvider } from './components/ui/ConfirmProvider.tsx'
import { AppThemeProvider } from './lib/appTheme.tsx'
import './css/minimal-theme.css'
import './css/workspace-shell.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  </StrictMode>,
)
