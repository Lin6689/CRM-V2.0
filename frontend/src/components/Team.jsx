import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", address: "" });
  const [error, setError] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const load = () => api("/api/users").then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "", businessName: "", address: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleDisabled = async (u) => {
    await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ disabled: !u.disabled }) });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Team (Admin only)</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Add Staff
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} autoComplete="off" className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Name *" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder="Email *" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2" />
          <div className="relative"><input placeholder="Password *" type={showPass?"text":"password"} value={form.password} required minLength={6} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2 pr-10" /><button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{showPass?"Hide":"Show"}</button></div>
          <div className="relative"><input placeholder="Confirm Password *" type={showPass?"text":"password"} value={confirmPass} required minLength={6} onChange={(e)=>setConfirmPass(e.target.value)} className="w-full border rounded-lg px-3 py-2 pr-10" /><button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{showPass?"Hide":"Show"}</button></div>
          <input placeholder="Shop name *" value={form.businessName} required onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder="Shop address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2" />
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Create Staff</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
          {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name} {u.id === user.id && "(you)"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.disabled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {u.disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="p-3">
                  {u.role === "staff" && u.id !== user.id && (
                    <button onClick={() => toggleDisabled(u)} className="text-blue-600 hover:underline text-sm">
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
