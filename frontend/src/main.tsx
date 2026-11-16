import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@/styles/globals.css'
import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import { bootstrapSession } from '@/features/auth/bootstrap'

const container = document.getElementById('root')
if (!container) throw new Error('Không tìm thấy phần tử #root')

async function start() {
  await bootstrapSession()
  createRoot(container!).render(
    <StrictMode>
      <AppProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProviders>
    </StrictMode>,
  )
}

void start()
