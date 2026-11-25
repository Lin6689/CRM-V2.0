import { useEffect, useState } from "react";
import { api, download } from "../api";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 10;

export default function Invoices() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "Cash", notes: "" });

  const [customerId, setCustomerId] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [status, setStatus] = useState("Pending");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: "", phone: "", email: "", address: "" });

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    try {
      const [inv, cust, prod] = await Promise.all([
        api(`/api/invoices?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debounced)}&status=${statusFilter}&sortBy=${sortBy}`),
        api("/api/customers?limit=100"),
        api("/api/products?limit=100"),
      ]);
      setInvoices(inv.items);
      setTotal(inv.total);
      setPages(inv.pages);
      setCustomers(cust.items);
      setProducts(prod.items);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [page, debounced, statusFilter, sortBy]);

  const reset = () => {
    setCustomerId(""); setTaxRate(0); setStatus("Pending"); setDueDate("");
    setItems([{ productId: "", quantity: 1 }]);
    setShowForm(false); setError("");
  };

  const setItem = (i, field, value) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  const lineTotal = (item) => {
    const p = products.find((p) => p._id === item.productId);
    return p ? p.price * Number(item.quantity) : 0;
  };

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const taxAmount = (subtotal * Number(taxRate)) / 100;
  const grandTotal = subtotal + taxAmount;

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/invoices", {
        method: "POST",
        body: JSON.stringify({ customerId, taxRate: Number(taxRate), status, dueDate: dueDate || null, items }),
      });
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quickAddCustomer = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const c = await api("/api/customers", { method: "POST", body: JSON.stringify(quickForm) });
      setCustomers([...customers, c]);
      setCustomerId(c._id);
      setShowQuickAdd(false);
      setQuickForm({ name: "", phone: "", email: "", address: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: payFor._id,
          amount: Number(payForm.amount),
          paymentMethod: payForm.paymentMethod,
          notes: payForm.notes,
        }),
      });
      setPayFor(null);
      setPayForm({ amount: "", paymentMethod: "Cash", notes: "" });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelInvoice = async (inv) => {
    if (!confirm("Invoice cancel karein? Stock restore ho jayega.")) return;
    try {
      await api(`/api/invoices/${inv._id}/cancel`, { method: "PATCH" });
      load();
    } catch (err) {
      alert(err.message);
    }
  };


  const sendEmail = async (inv) => {
    try {
      const r = await api(`/api/invoices/${inv._id}/send-email`, { method: "POST", body: JSON.stringify({}) });
      alert(r.message);
    } catch (err) {
      alert(err.message);
    }
  };

  const customer = customers.find((c) => c._id === selected?.customerId);

  const statusBadge = (s) => ({
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-blue-100 text-blue-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Overdue: "bg-red-100 text-red-700",
    Cancelled: "bg-gray-200 text-gray-600",
  }[s] || "bg-gray-100");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Invoices ({total})</h2>
        <button onClick={() => { reset(); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + Create Invoice
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input autoComplete="off" placeholder="Search customer/item..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="">All Status</option><option value="Paid">Paid</option>
          <option value="Partial">Partial</option><option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option><option value="Cancelled">Cancelled</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="createdAt">Newest</option><option value="oldest">Oldest</option>
          <option value="total">Total High</option><option value="customer">Customer A-Z</option>
        </select>
        <button onClick={() => download(`/api/invoices/export?status=${statusFilter}`, "invoices.csv")}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
      </div>

      {showForm && (
        <form onSubmit={submit} autoComplete="off" className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required
                className="w-full border rounded-lg px-3 py-2">
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-blue-600 text-xs mt-1">+ New Customer</button>
              {showQuickAdd && (
                <form onSubmit={quickAddCustomer} autoComplete="off" className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
                  <input placeholder="Name *" value={quickForm.name} required
                    onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                  <input placeholder="Phone *" value={quickForm.phone} required
                    onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                  <input placeholder="Email" value={quickForm.email}
                    onChange={(e) => setQuickForm({ ...quickForm, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm" />
                  <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded text-sm">Save & Select</button>
                </form>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax Rate % (GST/tax, 0 = no tax)</label>
              <input type="number" min="0" value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2">
                <option value="Pending">Pending (udhaar)</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Product *</label>
                <select value={item.productId} onChange={(e) => setItem(i, "productId", e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.productName} — ₹{p.price} (stock: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input type="number" min="1" value={item.quantity}
                  onChange={(e) => setItem(i, "quantity", e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">₹{lineTotal(item)}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))}
                    className="text-red-600 text-sm">Remove</button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setItems([...items, { productId: "", quantity: 1 }])}
            className="text-blue-600 text-sm">+ Add Item</button>

          <div className="border-t pt-3 text-sm space-y-1">
            <p>Subtotal: ₹{subtotal}</p>
            <p>Tax ({taxRate}%): ₹{taxAmount.toFixed(2)}</p>
            <p className="font-bold text-base">Grand Total: ₹{grandTotal.toFixed(2)}</p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? "Saving..." : "Save Invoice"}</button>
            <button type="button" onClick={reset} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Customer</th><th className="p-3">Items</th>
              <th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Due</th>
              <th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv._id} className="border-t">
                <td className="p-3 font-medium">{inv.customerName}</td>
                <td className="p-3">{inv.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}</td>
                <td className="p-3">₹{inv.grandTotal}</td>
                <td className="p-3 text-green-600">₹{inv.amountPaid || 0}</td>
                <td className="p-3 text-red-600">₹{inv.balanceDue ?? inv.grandTotal - (inv.amountPaid || 0)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${statusBadge(inv.status)}`}>{inv.status}</span>
                </td>
                <td className="p-3">{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => setSelected(inv)} className="text-blue-600 hover:underline text-sm">View</button>
                  {!["Paid", "Cancelled"].includes(inv.status) && (
                    <button onClick={() => { setPayFor(inv); setPayForm({ ...payForm, amount: String(inv.balanceDue ?? inv.grandTotal - (inv.amountPaid || 0)) }); }}
                      className="text-green-600 hover:underline text-sm">Pay</button>
                  )}
                  {isAdmin && inv.status !== "Cancelled" && (
                    <button onClick={() => cancelInvoice(inv)} className="text-red-600 hover:underline text-sm">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="8" className="p-6 text-center text-gray-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded bg-white disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm">Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded bg-white disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Payment modal */}
      {payFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={recordPayment} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Record Payment — {payFor.customerName}</h3>
              <button type="button" onClick={() => setPayFor(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-500">Balance Due: ₹{payFor.balanceDue ?? payFor.grandTotal - (payFor.amountPaid || 0)}</p>
            <input type="number" min="0.01" step="0.01" placeholder="Amount *" value={payForm.amount} required
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              className="w-full border rounded-lg px-3 py-2" />
            <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
              className="w-full border rounded-lg px-3 py-2">
              <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option>
            </select>
            <input placeholder="Notes (optional)" value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2" />
            <button type="submit" className="w-full bg-green-600 text-white rounded-lg py-2 text-sm">Record Payment</button>
          </form>
        </div>
      )}

      {/* Invoice bill modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div id="invoice-print" className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{user?.businessName || "Mini CRM"}</h3>
                {user?.address && <p className="text-xs text-gray-600">{user.address}</p>}
                <p className="text-xs text-gray-500">{user?.name} • {user?.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex justify-between text-sm border-b pb-2 mb-3">
              <div>
                <p className="font-semibold">Bill To: {selected.customerName}</p>
                {customer && <p className="text-gray-500">{customer.phone} {customer.address && `• ${customer.address}`}</p>}
              </div>
              <div className="text-right">
                <p>Invoice: #{selected._id.slice(-6).toUpperCase()}</p>
                <p className="text-gray-500">{new Date(selected.createdAt).toLocaleString()}</p>
                {selected.dueDate && <p className="text-gray-500">Due: {new Date(selected.dueDate).toLocaleDateString()}</p>}
              </div>
            </div>

            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Item</th><th className="py-2">Qty</th>
                  <th className="py-2">Price</th><th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((i, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{i.productName}</td>
                    <td className="py-2">{i.quantity}</td>
                    <td className="py-2">₹{i.unitPrice}</td>
                    <td className="py-2 text-right">₹{i.quantity * i.unitPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{selected.subtotal}</span></div>
              <div className="flex justify-between"><span>Tax ({selected.taxRate}%)</span><span>₹{selected.taxAmount}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Grand Total</span><span>₹{selected.grandTotal}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Amount Paid</span><span>₹{selected.amountPaid || 0}</span>
              </div>
              <div className="flex justify-between font-semibold text-red-700">
                <span>Balance Due</span><span>₹{selected.balanceDue ?? selected.grandTotal - (selected.amountPaid || 0)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 rounded text-sm font-medium ${statusBadge(selected.status)}`}>
                {selected.status}
              </span>
              <div className="flex gap-2">
                
                <button onClick={() => sendEmail(selected)} className="border border-blue-600 text-blue-600 px-3 py-2 rounded-lg text-sm hover:bg-blue-50">Email</button>
                <button onClick={() => window.print()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
