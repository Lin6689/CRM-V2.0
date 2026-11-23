import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, imageUrl } from "../api";
import { useAuth } from "../context/AuthContext";

const empty = { productName: "", sku: "", price: "", stockQuantity: "", image: null };
const PAGE_SIZE = 9;

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debounced, setDebounced] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    try {
      const data = await api(`/api/products?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(debounced)}&sortBy=${sortBy}`);
      setProducts(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [page, debounced, sortBy]);

  const reset = () => {
    setForm(empty); setEditingId(null); setShowForm(false); setError(""); setPreview("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const fd = new FormData();
      fd.append("productName", form.productName);
      fd.append("sku", form.sku);
      fd.append("price", form.price);
      fd.append("stockQuantity", form.stockQuantity);
      if (form.image) fd.append("image", form.image);

      if (editingId) {
        await api(`/api/products/${editingId}`, { method: "PUT", body: fd });
      } else {
        await api("/api/products", { method: "POST", body: fd });
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (p) => {
    setForm({ productName: p.productName, sku: p.sku, price: p.price, stockQuantity: p.stockQuantity, image: null });
    setPreview(imageUrl(p.imageUrl));
    setEditingId(p._id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  const pickImage = (e) => {
    const file = e.target.files[0];
    setForm({ ...form, image: file || null });
    setPreview(file ? URL.createObjectURL(file) : preview);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Products ({total})</h2>
        {isAdmin && (
          <button onClick={() => { reset(); setShowForm(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Add Product
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input autoComplete="off" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="createdAt">Newest</option><option value="oldest">Oldest</option>
          <option value="name">Name A-Z</option><option value="price">Price Low</option>
          <option value="-price">Price High</option><option value="stock">Low Stock</option>
        </select>
      </div>

      {showForm && isAdmin && (
        <form onSubmit={submit} autoComplete="off" className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="productName" placeholder="Product Name *" value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })} required className="border rounded-lg px-3 py-2" />
          <input name="sku" placeholder="SKU" value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input name="price" type="number" min="0" placeholder="Price (₹) *" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} required className="border rounded-lg px-3 py-2" />
          <input name="stockQuantity" type="number" min="0" placeholder="Stock Quantity *" value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} required className="border rounded-lg px-3 py-2" />
          <div>
            <input type="file" accept="image/*" onChange={pickImage} className="text-sm w-full" />
            {preview && <img src={preview} alt="preview" className="mt-2 h-16 w-16 object-cover rounded border" />}
          </div>
          <div className="flex gap-2 items-start">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">{editingId ? "Update" : "Save"}</button>
            <button type="button" onClick={reset} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
          {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p._id} className="bg-white rounded-xl shadow p-4">
            {p.imageUrl ? (
              <img src={imageUrl(p.imageUrl)} alt={p.productName} className="h-40 w-full object-cover rounded-lg mb-3" />
            ) : (
              <div className="h-40 w-full bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-sm">No image</div>
            )}
            <h3 className="font-semibold">{p.productName}</h3>
            <p className="text-sm text-gray-500">SKU: {p.sku || "-"}</p>
            <p className="text-sm">₹{p.price} &nbsp;|&nbsp; Stock: {p.stockQuantity}</p>
            {isAdmin && (
              <div className="mt-3 space-x-3">
                <button onClick={() => edit(p)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => remove(p._id)} className="text-red-600 text-sm hover:underline">Delete</button>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-400 col-span-full text-center py-8">No products found</p>
        )}
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
    </div>
  );
}
