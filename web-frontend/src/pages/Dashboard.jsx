import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, jobsAPI } from '../services/api';
import { Car, Wrench, CheckCircle, Plus, Bell } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Ready for Payment': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'Collected': 'bg-gray-100 text-gray-800',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        dashboardAPI.getStats(),
        jobsAPI.getAll({ limit: 5 })
      ]);
      setStats(statsData);
      setRecentJobs(jobsData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-gray-500 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold text-gray-900">{user?.username || 'User'}</h1>
          </div>
          <button className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Quick Create Button */}
        <Link
          to="/add"
          className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-xl mb-6 shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition"
        >
          <Plus className="w-6 h-6" />
          <span className="font-semibold">Quick Create Job</span>
        </Link>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_jobs || 0}</p>
            <p className="text-xs text-gray-500">Total Jobs</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
              <Wrench className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.active_jobs || 0}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.completed_jobs || 0}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>

        {/* Jobs by Status */}
        {stats?.by_status && Object.keys(stats.by_status).length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Jobs by Status</h2>
            <div className="space-y-2">
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                    {status}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Jobs */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link to="/jobs" className="text-blue-500 text-sm font-medium">View All</Link>
          </div>
          
          {recentJobs.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No jobs yet</p>
              <Link to="/add" className="text-blue-500 font-medium text-sm mt-2 inline-block">
                Create your first job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
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
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📅 {format(new Date(job.created_at), 'dd MMM')}</span>
                    {job.created_by && <span className="text-blue-500">• {job.created_by}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
