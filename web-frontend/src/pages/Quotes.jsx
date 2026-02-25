import { useState, useEffect } from 'react';
import { quotesAPI } from '../services/api';
import { Search, Plus, X, FileText, Trash2, DollarSign, Camera, Loader } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const PANEL_MAP = {
  1: 'Right Front Guard',
  2: 'Right Front Door',
  3: 'Right Rear Door',
  4: 'Right Rear Quarter',
  5: 'Tailgate Upper',
  6: 'Tailgate/Boot',
  7: 'Left Rear Quarter',
  8: 'Left Rear Door',
  9: 'Left Front Door',
  10: 'Left Front Guard',
  11: 'Bonnet',
  13: 'Right Rail',
  14: 'Roof',
  15: 'Left Rail',
  16: 'R&R'
};

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [panelPricing, setPanelPricing] = useState({});
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleRego, setVehicleRego] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState('');
  
  // Add panel modal
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [manualPrice, setManualPrice] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quotesData, pricingData] = await Promise.all([
        quotesAPI.getAll(),
        quotesAPI.getPanelPricing()
      ]);
      setQuotes(quotesData);
      setPanelPricing(pricingData.pricing || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert('Please add at least one panel');
      return;
    }
    
    try {
      await quotesAPI.create({
        customer_name: customerName,
        customer_phone: customerPhone || null,
        vehicle_registration: vehicleRego || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        line_items: lineItems,
        notes: notes || null
      });
      resetForm();
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      alert('Failed to create quote');
    }
  };

  const handleAddPanel = () => {
    if (!selectedPanel) return;
    
    const panelNum = parseInt(selectedPanel);
    const panelName = PANEL_MAP[panelNum];
    let price = 0;
    let isManual = false;
    
    // Get price from matrix or use manual
    if (panelPricing[panelNum] && panelPricing[panelNum][selectedCategory]) {
      price = panelPricing[panelNum][selectedCategory];
    } else if (manualPrice) {
      price = parseFloat(manualPrice);
      isManual = true;
    }
    
    if (!price) {
      alert('Please enter a price for this panel/category');
      return;
    }
    
    setLineItems([...lineItems, {
      panel_number: panelNum,
      panel_name: panelName,
      category: selectedCategory,
      price: price,
      is_manual_price: isManual
    }]);
    
    setShowAddPanel(false);
    setSelectedPanel('');
    setSelectedCategory(1);
    setManualPrice('');
  };

  const handleRemovePanel = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleDeleteQuote = async (id) => {
    if (!confirm('Delete this quote?')) return;
    try {
      await quotesAPI.delete(id);
      loadData();
    } catch (error) {
      alert('Failed to delete quote');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setVehicleRego('');
    setVehicleMake('');
    setVehicleModel('');
    setLineItems([]);
    setNotes('');
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.price, 0);
  };

  const getPriceForCategory = (panelNum, category) => {
    if (panelPricing[panelNum] && panelPricing[panelNum][category]) {
      return panelPricing[panelNum][category];
    }
    return null;
  };

  const filteredQuotes = quotes.filter(q =>
    search === '' ||
    q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.vehicle_registration?.toLowerCase().includes(search.toLowerCase()) ||
    q.quote_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
            data-testid="create-quote-btn"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="quotes-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No quotes found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-500 font-medium mt-2"
            >
              Create your first quote
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map(quote => (
              <div
                key={quote.id}
                className="bg-white p-4 rounded-xl shadow-sm"
                data-testid={`quote-card-${quote.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-500">{quote.quote_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        quote.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                        quote.status === 'Sent' ? 'bg-blue-100 text-blue-600' :
                        quote.status === 'Accepted' ? 'bg-green-100 text-green-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{quote.customer_name}</h3>
                    {quote.vehicle_registration && (
                      <p className="text-sm text-gray-500">
                        {quote.vehicle_registration} • {quote.vehicle_make} {quote.vehicle_model}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-lg font-bold text-green-600">
                        ${quote.total?.toFixed(2)}
                      </p>
                      <span className="text-xs text-gray-400">
                        {format(new Date(quote.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteQuote(quote.id)}
                    className="text-red-400 hover:text-red-600 p-2"
                    data-testid={`delete-quote-${quote.id}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Quote</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4">
              {/* Customer Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                  required
                  data-testid="quote-customer-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                  data-testid="quote-customer-phone"
                />
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={vehicleRego}
                  onChange={(e) => setVehicleRego(e.target.value.toUpperCase())}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Registration"
                  data-testid="quote-vehicle-rego"
                />
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Make"
                  data-testid="quote-vehicle-make"
                />
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Model"
                  data-testid="quote-vehicle-model"
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Panels</label>
                  <button
                    type="button"
                    onClick={() => setShowAddPanel(true)}
                    className="text-blue-500 text-sm font-medium flex items-center gap-1"
                    data-testid="add-panel-btn"
                  >
                    <Plus className="w-4 h-4" /> Add Panel
                  </button>
                </div>
                
                {lineItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-lg">
                    No panels added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lineItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.panel_name}</p>
                          <p className="text-xs text-gray-500">Category {item.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">${item.price}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePanel(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold text-gray-700">Total</span>
                      <span className="text-xl font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes"
                  rows={2}
                  data-testid="quote-notes"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                  data-testid="quote-submit-btn"
                >
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Panel Modal */}
      {showAddPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Panel</h2>
              <button onClick={() => setShowAddPanel(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Panel Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Panel</label>
                <select
                  value={selectedPanel}
                  onChange={(e) => setSelectedPanel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="panel-select"
                >
                  <option value="">Choose a panel...</option>
                  {Object.entries(PANEL_MAP).map(([num, name]) => (
                    <option key={num} value={num}>{num} - {name}</option>
                  ))}
                </select>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Damage Category</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(cat => {
                    const price = selectedPanel ? getPriceForCategory(parseInt(selectedPanel), cat) : null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-2 rounded-lg text-center transition ${
                          selectedCategory === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        data-testid={`category-${cat}-btn`}
                      >
                        <div className="font-semibold">Cat {cat}</div>
                        {price && <div className="text-xs">${price}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual Price */}
              {selectedPanel && !getPriceForCategory(parseInt(selectedPanel), selectedCategory) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manual Price *</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter price"
                    data-testid="manual-price-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">No preset price for this category</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPanel(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddPanel}
                  disabled={!selectedPanel}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                  data-testid="confirm-add-panel-btn"
                >
                  Add Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
