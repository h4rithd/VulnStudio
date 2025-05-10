
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Projects from './pages/Projects';
import NotFound from './pages/NotFound';
import NewProject from './pages/NewProject';
import EditProject from './pages/EditProject';
import ProjectDetails from './pages/ProjectDetails';
import AddVulnerability from './pages/AddVulnerability';
import VulnDB from './pages/VulnDB';
import ReportView from './pages/ReportView';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/layouts/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<NewProject />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/projects/:projectId/edit" element={<EditProject />} />
              
              {/* Vulnerability Routes */}
              <Route path="/projects/:projectId/vulnerabilities/new" element={<AddVulnerability />} />
              <Route path="/projects/:projectId/vulnerabilities/:vulnId" element={<AddVulnerability />} />
              <Route path="/projects/:projectId/vulnerabilities/:vulnId/edit" element={<AddVulnerability />} />
              
              {/* Report Route */}
              <Route path="/projects/:projectId/report" element={<ReportView />} />
              
              {/* VulnDB Route */}
              <Route path="/vulndb" element={<VulnDB />} />
            </Route>
            
            {/* Not Found */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
