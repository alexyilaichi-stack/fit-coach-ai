import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import AppLayout from './pages/AppLayout.jsx'
import TrainingTab from './tabs/TrainingTab.jsx'
import NutritionTab from './tabs/NutritionTab.jsx'
import InjuryTab from './tabs/InjuryTab.jsx'
import QuickLogTab from './tabs/QuickLogTab.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route path="training" element={<TrainingTab />} />
          <Route path="nutrition" element={<NutritionTab />} />
          <Route path="injury" element={<InjuryTab />} />
          <Route path="log" element={<QuickLogTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
