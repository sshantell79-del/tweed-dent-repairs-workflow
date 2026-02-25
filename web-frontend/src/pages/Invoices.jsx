import { useState, useEffect } from 'react';
import { invoicesAPI } from '../services/api';
import { Search, Plus, X, FileText, Trash2, DollarSign, Check, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const INVOICE_STATUSES = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

const STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-600',
  'Sent': 'bg-blue-100 text-blue-600',
  'Paid': 'bg-green-100 text-green-600',
  'Overdue': 'bg-red-100 text-red-600',
  'Cancelled': 'bg-gray-100 text-gray-500'
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await invoicesAPI.getAll();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = search === '' ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return <Check className="w-4 h-4" />;
      case 'Overdue': return <AlertCircle className="w-4 h-4" />;
      case 'Sent': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalStats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'Paid').length,
    outstanding: invoices.filter(i => ['Draft', 'Sent', 'Overdue'].includes(i.status)).reduce((sum, i) => sum + (i.total || 0), 0),
    paidAmount: invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.total || 0), 0)
  };

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-xl font-bold text-green-600">${totalStats.paidAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-orange-600">${totalStats.outstanding.toFixed(2)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoices-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {INVOICE_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">Create invoices from the job detail page</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map(invoice => (
              <button
                key={invoice.id}
                onClick={() => setSelectedInvoice(invoice)}
                className="w-full text-left bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
                data-testid={`invoice-card-${invoice.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-500">{invoice.invoice_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[invoice.status]}`}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{invoice.customer_name}</h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">${invoice.total?.toFixed(2)}</p>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Issued: {format(new Date(invoice.issue_date), 'dd MMM yyyy')}</span>
                  <span>Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedInvoice.invoice_number}</h2>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedInvoice.status]}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <button onClick={() => setSelectedInvoice(null)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedInvoice.customer_name}</p>
              {selectedInvoice.customer_email && <p className="text-sm text-gray-500">{selectedInvoice.customer_email}</p>}
              {selectedInvoice.customer_phone && <p className="text-sm text-gray-500">{selectedInvoice.customer_phone}</p>}
              {selectedInvoice.customer_address && <p className="text-sm text-gray-500">{selectedInvoice.customer_address}</p>}
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Line Items</h3>
              <div className="space-y-2">
                {selectedInvoice.line_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × ${item.unit_price?.toFixed(2)}</p>
                    </div>
                    <p className="font-medium text-gray-900">${item.total?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">${selectedInvoice.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST (10%)</span>
                <span className="text-gray-900">${selectedInvoice.gst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">${selectedInvoice.total?.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Dates */}
            <div className="mt-4 text-xs text-gray-400 text-center">
              <p>Issued: {format(new Date(selectedInvoice.issue_date), 'dd MMM yyyy')}</p>
              <p>Due: {format(new Date(selectedInvoice.due_date), 'dd MMM yyyy')}</p>
              {selectedInvoice.paid_date && <p>Paid: {format(new Date(selectedInvoice.paid_date), 'dd MMM yyyy')}</p>}
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
