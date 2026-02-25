import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, FileText, Receipt, Settings, Bell, HelpCircle, LogOut, ChevronRight, Phone, Mail, MapPin } from 'lucide-react';
import Layout from '../components/Layout';

export default function Profile() {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: Receipt, label: 'Invoices', to: '/invoices', color: 'text-green-500' },
    { icon: FileText, label: 'Quotes', to: '/quotes', color: 'text-blue-500' },
  ];

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user?.username || 'User'}</h1>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                {user?.role || 'Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm mb-4">
          {menuItems.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between p-4 hover:bg-gray-50 transition ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              data-testid={`profile-link-${item.label.toLowerCase()}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Business Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">Tweed Heads, NSW, Australia</span>
            </div>
            <a href="tel:0266500000" className="flex items-center gap-3 text-blue-500">
              <Phone className="w-5 h-5" />
              <span>02 6650 0000</span>
            </a>
            <a href="mailto:info@tweeddentrepairs.com.au" className="flex items-center gap-3 text-blue-500">
              <Mail className="w-5 h-5" />
              <span>info@tweeddentrepairs.com.au</span>
            </a>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-xl shadow-sm mb-4">
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Notifications</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">Help & Support</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 transition"
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Tweed Dent Repairs Workflow v1.0.0
        </p>
      </div>
    </Layout>
  );
}
