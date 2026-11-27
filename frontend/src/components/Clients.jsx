import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Clients() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setUsers(await api("/api/users"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  if (user?.role !== "superadmin") {
    return <p className="text-red-600">Access denied</p>;
  }

  const clients = users.filter((u) => u.role === "admin");
  const staff = users.filter((u) => u.role === "staff");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clients</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Total Clients</p>
          <p className="text-3xl font-bold">{clients.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-gray-500 text-sm">Total Staff</p>
          <p className="text-3xl font-bold">{staff.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Business</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Staff</th>
              <th className="text-left px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-medium">{c.businessName}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3">{users.filter((s) => s.role === "staff" && String(s.businessId) === String(c.id)).length}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No clients yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
