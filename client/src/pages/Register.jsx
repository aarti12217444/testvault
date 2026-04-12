import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

const Register = () => {
  // const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [form, setForm] = useState({ 
  name: '', email: '', password: '', 
  confirmPassword: '', inviteCode: '' 
});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^a-zA-Z\d]/.test(pass)) score++;
    if (score <= 2) return { strength: score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { strength: score, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: score, label: 'Strong', color: 'bg-green-500' };
  };

  const passStrength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (passStrength.label === 'Weak') {
      toast.error('Please use a stronger password!');
      return;
    }
    setLoading(true);
    try {
          await API.post('/auth/register-with-code', {
      name: form.name,
      email: form.email,
      password: form.password,
      inviteCode: form.inviteCode
    });
      toast.success('Registered successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">📚 ExamPlatform</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" required
              autoComplete="name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="John Doe"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                placeholder="Min 8 chars, A-Z, a-z, 0-9, special char"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Institute Invite Code
  </label>
  <input
    type="text" required
    autoComplete="off"
    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
    placeholder="e.g. LPU2024"
    value={form.inviteCode}
    onChange={e => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })}
  />
  <p className="text-xs text-gray-400 mt-1">
    Ask your institute admin for the invite code
  </p>
</div>
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i}
                      className={`h-1.5 flex-1 rounded-full ${i <= passStrength.strength ? passStrength.color : 'bg-gray-200'}`}>
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  passStrength.label === 'Strong' ? 'text-green-600' :
                  passStrength.label === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  Password strength: {passStrength.label}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Must have: 8+ chars, A-Z, a-z, 0-9, any special character
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password" required
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">❌ Passwords do not match</p>
            )}
            {form.confirmPassword && form.password === form.confirmPassword && (
              <p className="text-xs text-green-500 mt-1">✅ Passwords match</p>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-60 mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;