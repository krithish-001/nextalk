import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      return toast.error('Please fill in all fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (form.password !== form.confirm) {
      return toast.error('Passwords do not match');
    }

    const res = await register(form.username, form.email, form.password);
    if (res.success) {
      toast.success('Account created! Welcome to NexTalk 🎉');
      navigate('/');
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500/10 rounded-2xl border border-primary-500/20 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NexTalk</h1>
          <p className="text-white/40 text-sm mt-1">Join the conversation</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Username</label>
              <input
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="cooluser42"
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5 font-medium">Confirm password</label>
              <input
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
