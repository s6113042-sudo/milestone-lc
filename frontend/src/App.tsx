import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CreateLc from './pages/buyer/CreateLc';
import LcList from './pages/buyer/LcList';
import NftWallet from './pages/buyer/NftWallet';
import Orders from './pages/seller/Orders';
import ConfirmShipment from './pages/seller/ConfirmShipment';
import Payments from './pages/seller/Payments';
import PickupVerify from './pages/PickupVerify';
import AdminDashboard from './pages/admin/Dashboard';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/buyer/lcs" replace />} />
          <Route path="/buyer/lcs" element={<LcList />} />
          <Route path="/buyer/create" element={<CreateLc />} />
          <Route path="/buyer/nfts" element={<NftWallet />} />
          <Route path="/seller/orders" element={<Orders />} />
          <Route path="/seller/confirm/:lcId" element={<ConfirmShipment />} />
          <Route path="/seller/payments" element={<Payments />} />
          <Route path="/pickup" element={<PickupVerify />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
