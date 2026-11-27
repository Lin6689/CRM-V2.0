import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

export default function Layout() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [shop, setShop] = useState({ businessName: "", address: "" });
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";
  const isSuper = user?.role === "superadmin";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openEdit = () => {
    setShop({ businessName: user.businessName || "", address: user.address || "" });
    setError("");
    setShowEdit(true);
  };

  const saveShop = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const updated = await api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(shop),
      });
      updateUser(updated);
      setShowEdit(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const linkClass = ({ isActive }) =>
    `pb-2 text-sm font-medium border-b-2 ${isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{user?.businessName || "Mini CRM"}</h1>
            <p className="text-xs text-gray-500">
              {user?.name} • {user?.email} • <span>{user?.role === "superadmin" ? "Admin" : user?.role === "admin" ? "Client" : "Staff"}</span>
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={openEdit} className="text-sm text-blue-600 hover:underline">
              Edit Shop
            </button>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-4">
          {isSuper && <NavLink to="/clients" className={linkClass}>Clients</NavLink>}
          {isAdmin && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
          {!isSuper && <NavLink to="/customers" className={linkClass}>Customers</NavLink>}
          {!isSuper && <NavLink to="/products" className={linkClass}>Products</NavLink>}
          {!isSuper && <NavLink to="/invoices" className={linkClass}>Invoices</NavLink>}
          {isAdmin && <NavLink to="/team" className={linkClass}>Team</NavLink>}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={saveShop} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Edit Shop Details</h3>
              <button type="button" onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <input placeholder="Shop name" value={shop.businessName}
              onChange={(e) => setShop({ ...shop, businessName: e.target.value })} required
              className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="Shop address" value={shop.address}
              onChange={(e) => setShop({ ...shop, address: e.target.value })} required
              className="w-full border rounded-lg px-3 py-2" />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
