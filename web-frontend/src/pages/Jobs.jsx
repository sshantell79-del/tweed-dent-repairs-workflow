import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import { Search, X, Car, Plus } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const JOB_STATUSES = ['All', 'New', 'In Progress', 'Ready for Payment', 'Completed', 'Collected'];
const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Ready for Payment': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'Collected': 'bg-gray-100 text-gray-800',
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await jobsAPI.getAll();
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === '' || 
      job.car_info?.registration?.toLowerCase().includes(search.toLowerCase()) ||
      job.owner_info?.name?.toLowerCase().includes(search.toLowerCase()) ||
      job.car_info?.make?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <Link
            to="/add"
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <Plus className="w-6 h-6 text-white" />
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {JOB_STATUSES.map(status => (
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

        {/* Jobs List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900 tracking-wide">
                      {job.car_info?.registration}
                    </p>
                    <p className="text-sm text-gray-500">
                      {job.car_info?.year} {job.car_info?.make} {job.car_info?.model}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100'}`}>
                    {job.status}
                  </span>
                </div>
                {job.owner_info?.name && (
                  <p className="text-sm text-gray-600 mb-2">👤 {job.owner_info.name}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>📅 {format(new Date(job.created_at), 'dd MMM yyyy')}</span>
                  {job.created_by && <span className="text-blue-500">• {job.created_by}</span>}
                  {job.photos?.length > 0 && <span>📷 {job.photos.length}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
