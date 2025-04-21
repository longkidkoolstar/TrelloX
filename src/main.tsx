import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DndProvider from './components/DndProvider'
import { ModalProvider } from './context/ModalContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModalProvider>
      <DndProvider>
        <App />
      </DndProvider>
    </ModalProvider>
  </StrictMode>,
)
