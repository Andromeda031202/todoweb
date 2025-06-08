import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../App"; 

const Login = () => {
  const [serverStatus, setServerStatus] = useState({ checked: false, online: false });
  const [form, setForm] = useState({ 
    email: "", 
    password: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated, setUserRole } = useAuth();

  
  useEffect(() => {
    const checkServerStatus = async () => {
      const health = await axiosInstance.checkHealth();
      setServerStatus({ 
        checked: true, 
        online: health.available 
      });
    };
    
    checkServerStatus();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (loading) return; 

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post('/auth/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role
      }, {
        timeout: 8000 
      });

      if (response.data.token && response.data.user) {
        
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.user.role);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        
        setIsAuthenticated(true);
        setUserRole(response.data.user.role);

       
        navigate(response.data.user.role === "admin" ? "/dashboard" : "/userdashboard", { replace: true });
      } else {
        setError("Login failed: Invalid response from server");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      if (err.response) {
        switch (err.response.status) {
          case 401:
            setError('Invalid credentials');
            break;
          case 404:
            setError('User not found');
            break;
          case 500:
            setError('Server error occurred');
            break;
          default:
            setError(err.response.data?.message || 'Login failed');
        }
      } else if (err.request) {
        setError('No response from server');
      } else {
        setError('Login failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-lg shadow-lg">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-pink-900 mb-2">Welcome Back!</h2>
          <p className="text-gray-600">Sign in to continue</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !serverStatus.online}
            className="bg-pink-900 text-white py-3 px-6 rounded-lg hover:bg-pink-800 w-full transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/auth/register" className="text-pink-900 hover:text-pink-800 font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;