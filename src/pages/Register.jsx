import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

const Register = () => {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "user"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email || !form.username || !form.password || !form.confirmPassword) {
      setError("All fields are required");
      return false;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      await axiosInstance.post("/auth/register", {
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
        role: form.role
      });
      
      navigate("/auth/login");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex h-screen items-center justify-center bg-cover bg-center bg-gradient-to-br from-pink-100 to-pink-200"
      style={{ 
        backgroundImage: "url('/to-do list bg admin.jpg')",
        backgroundBlendMode: "overlay" 
      }}
    >
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl w-96 text-center transform hover:scale-[1.01] transition-all">
        <h1 className="text-3xl font-bold text-pink-900 mb-6">Create Account</h1>

        {error && (
          <div className="bg-red-100 text-red-800 p-2 mb-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4 text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          <div className="mb-4 text-left">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          <div className="mb-4 text-left relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mb-4 text-left">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>

          <div className="mb-6 text-left">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              disabled={loading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-pink-900 text-white py-3 px-6 rounded-lg hover:bg-pink-800 w-full transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mb-4"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-pink-900 hover:text-pink-800 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register; 