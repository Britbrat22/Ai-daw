import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DAW from './components/DAW'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router basename={process.env.NODE_ENV === 'production' ? '/ai-daw' : ''}>
        <div className="App">
          <Routes>
            <Route path="/" element={<DAW />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
