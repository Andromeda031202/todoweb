import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import ProjectPage from "./pages/ProjectPage";
import ProjectListPage from "./pages/ProjectListPage";
import TaskPage from "./pages/TaskPage";
import TaskList from "./pages/TaskList";
import UsersList from "./pages/UsersList";
import ServerStatus from "./components/ServerStatus";
import axiosInstance from "./utils/axiosInstance";

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};


const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || !role) {
      setIsAuthenticated(false);
      setUserRole(null);
      setLoading(false);
      setAuthChecked(true);
      return;
    }

    
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      await axiosInstance.get('/auth/check-admin-exists', { timeout: 5000 });
      setIsAuthenticated(true);
      setUserRole(role);
    } catch (err) {
      console.error("Token verification failed:", err);
      localStorage.clear();
      delete axiosInstance.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const logout = () => {
    localStorage.clear();
    delete axiosInstance.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUserRole(null);
  };

  useEffect(() => {
    if (!authChecked) {
      checkAuth();
    }
  }, [authChecked]);

  const value = {
    isAuthenticated,
    userRole,
    loading,
    logout,
    setIsAuthenticated,
    setUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

function AppLayout({ children }) {
  return (
    <div className="bg-cover bg-center bg-no-repeat min-h-screen" 
         style={{ 
           backgroundImage: "url('/to-do list bg admin.jpg')",
           backgroundSize: "cover",
           backgroundPosition: "center"
         }}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <div className="w-full px-4 py-8">
            {children}
          </div>
        </div>
        <ServerStatus />
      </div>
    </div>
  );
}


const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (adminOnly && userRole !== 'admin') {
    return <Navigate to="/userdashboard" replace />;
  }

  return (
    <>
      {children}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-pink-900 text-white px-4 py-2 rounded hover:bg-pink-800 z-10"
      >
        Logout
      </button>
    </>
  );
};


function App() {
  return (
    <Router future={ROUTER_FUTURE_FLAGS}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}


function AppContent() {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth/login" element={
        isAuthenticated ? (
          <Navigate to={userRole === 'admin' ? '/dashboard' : '/userdashboard'} replace />
        ) : (
          <AppLayout>
            <Login />
          </AppLayout>
        )
      } />
      
      <Route path="/auth/register" element={
        isAuthenticated ? (
          <Navigate to={userRole === 'admin' ? '/dashboard' : '/userdashboard'} replace />
        ) : (
          <AppLayout>
            <Register />
          </AppLayout>
        )
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute adminOnly>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/userdashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <UserDashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/taskList" element={
        <ProtectedRoute>
          <AppLayout>
            <TaskList />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/projectPage" element={
        <ProtectedRoute>
          <AppLayout>
            <ProjectPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/projectList" element={
        <ProtectedRoute>
          <AppLayout>
            <ProjectListPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/taskPage" element={
        <ProtectedRoute>
          <AppLayout>
            <TaskPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/usersList" element={
        <ProtectedRoute adminOnly>
          <AppLayout>
            <UsersList />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      
      <Route path="*" element={
        <Navigate to={isAuthenticated ? (userRole === 'admin' ? '/dashboard' : '/userdashboard') : '/auth/login'} replace />
      } />
    </Routes>
  );
}

export default App;