import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (user) return <Navigate to={user.role === "superadmin" ? "/clients" : user.role === "admin" ? "/dashboard" : "/customers"} />;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.token, data.user);
      navigate(data.user.role === "superadmin" ? "/clients" : data.user.role === "admin" ? "/dashboard" : "/customers");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Mini CRM</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Login to your account</p>

        <form onSubmit={submit} className="space-y-4">
          <input name="email" type="email" placeholder="Email" value={form.email}
            onChange={set} required
            className="w-full border rounded-lg px-3 py-2" />

          <div className="relative">
            <input name="password" type={showPass ? "text" : "password"} placeholder="Password"
              value={form.password} onChange={set} required minLength={6}
              className="w-full border rounded-lg px-3 py-2 pr-10" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
