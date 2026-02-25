import { useState, useEffect } from 'react';
import { customersAPI } from '../services/api';
import { Search, Plus, X, User, Phone, Mail, MapPin, Trash2, Edit } from 'lucide-react';
import Layout from '../components/Layout';

export default function Contacts() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await customersAPI.create({
        name,
        phone,
        email: email || null,
        address: address || null,
        notes: notes || null,
        vehicles: []
      });
      resetForm();
      setShowAddModal(false);
      loadCustomers();
    } catch (error) {
      alert('Failed to add customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await customersAPI.delete(id);
      loadCustomers();
    } catch (error) {
      alert('Failed to delete customer');
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  const filteredCustomers = customers.filter(c => 
    search === '' ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
            data-testid="add-contact-btn"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="contacts-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Contacts List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No contacts found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-blue-500 font-medium mt-2"
            >
              Add your first contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className="bg-white p-4 rounded-xl shadow-sm"
                data-testid={`contact-card-${customer.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      {customer.name}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm">
                      {customer.phone && (
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-blue-500">
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </a>
                      )}
                      {customer.email && (
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </a>
                      )}
                      {customer.address && (
                        <p className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {customer.address}
                        </p>
                      )}
                    </div>
                    {customer.jobs_count > 0 && (
                      <p className="mt-2 text-xs text-gray-400">
                        {customer.jobs_count} job(s)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="text-red-400 hover:text-red-600 p-2"
                    data-testid={`delete-contact-${customer.id}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Full name"
                  required
                  data-testid="contact-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                  required
                  data-testid="contact-phone-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                  data-testid="contact-email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Address"
                  rows={2}
                  data-testid="contact-address-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                  rows={2}
                  data-testid="contact-notes-input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                  data-testid="contact-submit-btn"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
