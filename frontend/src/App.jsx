import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Products from "./components/Products";
import Invoices from "./components/Invoices";
import Team from "./components/Team";
import Clients from "./components/Clients";
import { useAuth } from "./context/AuthContext";

function Home() {
  const { user } = useAuth();
  const to = user?.role === "superadmin" ? "/clients" : user?.role === "admin" ? "/dashboard" : "/customers";
  return <Navigate to={to} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="team" element={<Team />} />
          <Route path="clients" element={<Clients />} />
        </Route>
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
