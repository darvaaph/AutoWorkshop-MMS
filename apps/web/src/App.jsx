import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Login from './pages/auth/Login';
import POS from './pages/pos/POS';
import Products from './pages/inventory/Products';
import Services from './pages/inventory/Services';
import Packages from './pages/inventory/Packages';
import StockIn from './pages/inventory/StockIn';
import TransactionList from './pages/transactions/TransactionList';
import TransactionDetail from './pages/transactions/TransactionDetail';
import Customers from './pages/master/Customers';
import Vehicles from './pages/master/Vehicles';
import Mechanics from './pages/master/Mechanics';
import Expenses from './pages/finance/Expenses';
import Reports from './pages/finance/Reports';
import ShopSettings from './pages/settings/ShopSettings';
import UserManagement from './pages/settings/UserManagement';
import AuditLogs from './pages/audit/AuditLogs';

const App = () => {
  return (
    <Router>
      <Header />
      <Sidebar />
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory/products" element={<Products />} />
          <Route path="/inventory/services" element={<Services />} />
          <Route path="/inventory/packages" element={<Packages />} />
          <Route path="/inventory/stock-in" element={<StockIn />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/master/customers" element={<Customers />} />
          <Route path="/master/vehicles" element={<Vehicles />} />
          <Route path="/master/mechanics" element={<Mechanics />} />
          <Route path="/finance/expenses" element={<Expenses />} />
          <Route path="/finance/reports" element={<Reports />} />
          <Route path="/settings/shop" element={<ShopSettings />} />
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/audit" element={<AuditLogs />} />
        </Routes>
      </MainLayout>
    </Router>
  );
};

export default App;