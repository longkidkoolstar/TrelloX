import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DndProvider from './components/DndProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DndProvider>
      <App />
    </DndProvider>
  </StrictMode>,
)
