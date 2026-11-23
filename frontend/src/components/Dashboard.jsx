import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/analytics/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-gray-400">Loading dashboard...</p>;

  const kpis = [
    ["Total Revenue", `₹${data.totalRevenue}`],
    ["Pending Receivables", `₹${data.totalPendingReceivables}`],
    ["Total Invoices", data.totalInvoices],
    ["Active Customers", data.activeCustomers],
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold mb-3">Monthly Sales (last 6 months)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.monthlySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip formatter={(v) => `₹${v}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Top 5 Selling Products</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="_id" width={120} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Bar dataKey="revenue" name="Revenue" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-3">Low Stock Alerts (≤10)</h3>
          {data.lowStockAlerts.length === 0 ? (
            <p className="text-sm text-gray-400">Sab products ka stock theek hai</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.lowStockAlerts.map((p) => (
                  <tr key={p._id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href=`/products?q=${encodeURIComponent(p.productName)}`}>
                    <td className="py-2">{p.productName}</td>
                    <td className="py-2 text-right">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                        {p.stockQuantity} left
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
