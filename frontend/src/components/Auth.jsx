import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", address: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (user) return <Navigate to="/dashboard" />;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setSuccess("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register") {
      const errs = [];
      if (!/@gmail\.com$/i.test(form.email)) errs.push("Email must end with @gmail.com");
      const p = form.password;
      if ((p.match(/[A-Za-z]/g) || []).length < 6) errs.push("Password must have at least 6 letters");
      if (!/[A-Z]/.test(p)) errs.push("Password must have 1 capital letter");
      if (!/[0-9]/.test(p)) errs.push("Password must have 1 number");
      if (!/[^A-Za-z0-9]/.test(p)) errs.push("Password must have 1 special character");
      if (errs.length) {
        setError(errs.join("\n"));
        return;
      }
    }

    setLoading(true);
    try {
      const data = await api(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      if (mode === "register") {
        setMode("login");
        setSuccess("Registration successful! Please login.");
        setForm({ ...form, password: "" });
      } else {
        login(data.token, data.user);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">Mini CRM</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          {isLogin ? "Login to your account" : "Create a new business account"}
        </p>

        <form autoComplete="off" onSubmit={submit} className="space-y-4">
          {!isLogin && (
            <>
              <input autoComplete="off" name="name" placeholder="Your name" value={form.name} onChange={set} required
                className="w-full border rounded-lg px-3 py-2" />
              <input autoComplete="off" name="businessName" placeholder="Shop name *" value={form.businessName} onChange={set} required
                className="w-full border rounded-lg px-3 py-2" />
              <input autoComplete="off" name="address" placeholder="Shop address *" value={form.address} onChange={set} required
                className="w-full border rounded-lg px-3 py-2" />
            </>
          )}
          <input autoComplete="off" name="email" type="email" placeholder="Email" value={form.email} onChange={set} required
            className="w-full border rounded-lg px-3 py-2" />

          <div className="relative">
            <input autoComplete="off" name="password" type={showPass ? "text" : "password"} placeholder="Password"
              value={form.password} onChange={set} required minLength={6}
              className="w-full border rounded-lg px-3 py-2 pr-10" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          {success && <p className="text-green-600 text-sm">{success}</p>}

          {error && (
            <div className="text-red-600 text-sm space-y-1">
              {error.split("\n").map((m, i) => <p key={i}>• {m}</p>)}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button className="text-blue-600 font-medium" onClick={switchMode}>
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
