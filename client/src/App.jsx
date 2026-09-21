import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import TaskDetail from './pages/TaskDetail';
import DecisionLab from './pages/DecisionLab';
import DecisionHistory from './pages/DecisionHistory';
import DecisionInsights from './pages/DecisionInsights';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTasks from './pages/admin/AdminTasks';
import AdminDecisions from './pages/admin/AdminDecisions';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminReports from './pages/admin/AdminReports';
import AdminNotifications from './pages/admin/AdminNotifications';
import Feedback from './pages/Feedback';
import AdminFeedback from './pages/admin/AdminFeedback';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/decision-lab" element={<ProtectedRoute><DecisionLab /></ProtectedRoute>} />
            <Route path="/decision-insights" element={<ProtectedRoute><DecisionInsights /></ProtectedRoute>} />
            <Route path="/decision-history" element={<ProtectedRoute><DecisionHistory /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
            <Route path="/admin/tasks" element={<AdminProtectedRoute><AdminTasks /></AdminProtectedRoute>} />
            <Route path="/admin/decisions" element={<AdminProtectedRoute><AdminDecisions /></AdminProtectedRoute>} />
            <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<AdminProtectedRoute><AdminAuditLogs /></AdminProtectedRoute>} />
            <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
            <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminNotifications /></AdminProtectedRoute>} />
            <Route path="/admin/feedback" element={<AdminProtectedRoute><AdminFeedback /></AdminProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
