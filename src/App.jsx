import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.js'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import AppLayout from './pages/AppLayout.jsx'
import TrainingTab from './tabs/TrainingTab.jsx'
import NutritionTab from './tabs/NutritionTab.jsx'
import InjuryTab from './tabs/InjuryTab.jsx'
import QuickLogTab from './tabs/QuickLogTab.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={<RequireAuth><OnboardingPage /></RequireAuth>}
        />
        <Route
          path="/app"
          element={<RequireAuth><AppLayout /></RequireAuth>}
        >
          <Route path="training" element={<TrainingTab />} />
          <Route path="nutrition" element={<NutritionTab />} />
          <Route path="injury" element={<InjuryTab />} />
          <Route path="log" element={<QuickLogTab />} />
          <Route index element={<Navigate to="training" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
