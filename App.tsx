import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ListingsPage from './pages/ListingsPage';
import AddListingPage from './pages/AddListingPage';
import ListingDetailPage from './pages/ListingDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import TradeManagementPage from './pages/TradeManagementPage';
import { useAppContext } from './context/AppContext';
import Alert from './components/Alert';
import LoginPage from './src/pages/LoginPage';
import SignupPage from './src/pages/SignupPage';
import MyTradesPage from './pages/MyTradesPage';

const App: React.FC = () => {
  const { alert } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen font-sans text-coffee-primary">
      <Navbar />
      {alert && <Alert message={alert.message} type={alert.type} />}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/:listingId" element={<ListingDetailPage />} />
          <Route path="/add-listing" element={<AddListingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/trades" element={<TradeManagementPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/my-trades" element={<MyTradesPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
