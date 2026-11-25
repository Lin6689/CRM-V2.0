import { useEffect, useState } from "react";
import { api, download } from "../api";
import { useAuth } from "../context/AuthContext";

const empty = { name: "", phone: "", email: "", address: "", currentBalance: 0 };
const PAGE_SIZE = 8;

export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [ledger, setLedger] = useState(null);

  // Debounce search — 400ms baad API call
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    try {
      const data = await api(`/api/customers?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debounced)}&sortBy=${sortBy}`);
      setCustomers(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [page, debounced, sortBy]);

  const reset = () => { setForm(empty); setEditingId(null); setShowForm(false); setError(""); };

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        await api(`/api/customers/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/api/customers", { method: "POST", body: JSON.stringify(form) });
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (c) => {
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, currentBalance: c.currentBalance });
    setEditingId(c._id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this customer?")) return;
    await api(`/api/customers/${id}`, { method: "DELETE" });
    load();
  };

  const openLedger = async (c) => {
    try {
      setLedger(await api(`/api/customers/${c._id}/ledger`));
    } catch (err) {
      alert(err.message);
    }
  };

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Customers ({total})</h2>
        <div className="flex gap-2">
          <button onClick={() => download("/api/customers/export", "customers.csv")}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">
            Export CSV
          </button>
          <button onClick={() => { reset(); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Add Customer
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input autoComplete="off" placeholder="Search by name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="createdAt">Newest</option><option value="oldest">Oldest</option>
          <option value="name">Name A-Z</option><option value="currentBalance">Balance</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={submit} autoComplete="off" className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="name" placeholder="Name *" value={form.name} onChange={set} required className="border rounded-lg px-3 py-2" />
          <input name="phone" placeholder="Phone *" value={form.phone} onChange={set} required className="border rounded-lg px-3 py-2" />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={set} className="border rounded-lg px-3 py-2" />
          <input name="address" placeholder="Address" value={form.address} onChange={set} className="border rounded-lg px-3 py-2" />
          <input name="currentBalance" type="number" placeholder="Current Balance" value={form.currentBalance} onChange={set} className="border rounded-lg px-3 py-2" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? "Saving..." : editingId ? "Update" : "Save"}</button>
            <button type="button" onClick={reset} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
          {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Email</th>
              <th className="p-3">Address</th><th className="p-3">Balance</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.address}</td>
                <td className="p-3">₹{c.currentBalance}</td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => openLedger(c)} className="text-purple-600 hover:underline">Ledger</button>
                  {isAdmin && (
                    <>
                      <button onClick={() => edit(c)} className="text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => remove(c._id)} className="text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-center text-gray-400">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Ledger modal */}
      {ledger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{ledger.customer.name} — Ledger</h3>
                <p className="text-sm text-gray-500">{ledger.customer.phone} • Balance: ₹{ledger.customer.currentBalance}</p>
              </div>
              <button onClick={() => setLedger(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left"><th className="py-2">Date</th><th className="py-2">Type</th><th className="py-2">Details</th><th className="py-2 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {[
                  ...ledger.invoices.map((i) => ({
                    date: i.createdAt, type: "Invoice",
                    details: `#${i._id.slice(-6).toUpperCase()} (${i.items.map((x) => `${x.productName} x${x.quantity}`).join(", ")})`,
                    amount: i.grandTotal, credit: false,
                  })),
                  ...ledger.payments.map((p) => ({
                    date: p.createdAt, type: `Payment (${p.paymentMethod})`,
                    details: p.notes || `Against invoice #${p.invoiceId.slice(-6).toUpperCase()}`,
                    amount: p.amount, credit: true,
                  })),
                ].sort((a, b) => new Date(a.date) - new Date(b.date)).map((r, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="py-2">{r.type}</td>
                    <td className="py-2 text-gray-600">{r.details}</td>
                    <td className={`py-2 text-right font-medium ${r.credit ? "text-green-600" : "text-red-600"}`}>
                      {r.credit ? "+" : "-"}₹{r.amount}
                    </td>
                  </tr>
                ))}
                {ledger.invoices.length === 0 && ledger.payments.length === 0 && (
                  <tr><td colSpan="4" className="py-6 text-center text-gray-400">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
