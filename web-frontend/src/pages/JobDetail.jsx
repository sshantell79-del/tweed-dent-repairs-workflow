import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobsAPI } from '../services/api';
import { ArrowLeft, Edit, Trash2, Camera, Clock, User, Phone, Mail, MapPin, Shield, FileText, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';

const JOB_STATUSES = [
  'Received',
  'Awaiting Parts',
  'Awaiting Approval',
  'In Progress',
  'Ready for Payment',
  'Completed',
  'Collected'
];

const STATUS_COLORS = {
  'Received': 'bg-blue-100 text-blue-800',
  'Awaiting Parts': 'bg-orange-100 text-orange-800',
  'Awaiting Approval': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Ready for Payment': 'bg-pink-100 text-pink-800',
  'Completed': 'bg-green-100 text-green-800',
  'Collected': 'bg-gray-100 text-gray-800'
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await jobsAPI.getById(id);
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
      alert('Failed to load job');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await jobsAPI.updateStatus(id, newStatus);
      await loadJob();
      setShowStatusDropdown(false);
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await jobsAPI.delete(id);
      navigate('/jobs', { replace: true });
    } catch (error) {
      alert('Failed to delete job');
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

  if (!job) {
    return (
      <Layout>
        <div className="p-4 text-center">
          <p className="text-gray-500">Job not found</p>
          <Link to="/jobs" className="text-blue-500 mt-2 inline-block">Back to Jobs</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate('/jobs')} className="text-blue-500 font-medium flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{job.car_info?.registration}</h1>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 p-2"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Current Status</span>
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                disabled={updating}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${STATUS_COLORS[job.status] || 'bg-gray-100'}`}
              >
                {job.status}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  {JOB_STATUSES.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        status === job.status ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {job.created_by && (
            <p className="text-xs text-gray-400 mt-2">Created by {job.created_by}</p>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            🚗 Vehicle Information
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Registration</p>
              <p className="font-medium text-gray-900">{job.car_info?.registration || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Make</p>
              <p className="font-medium text-gray-900">{job.car_info?.make || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Model</p>
              <p className="font-medium text-gray-900">{job.car_info?.model || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Year</p>
              <p className="font-medium text-gray-900">{job.car_info?.year || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Color</p>
              <p className="font-medium text-gray-900">{job.car_info?.color || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">VIN</p>
              <p className="font-medium text-gray-900">{job.car_info?.vin || '-'}</p>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        {job.owner_info && (job.owner_info.name || job.owner_info.phone) && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Owner Information
            </h2>
            <div className="space-y-2 text-sm">
              {job.owner_info.name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{job.owner_info.name}</span>
                </div>
              )}
              {job.owner_info.phone && (
                <a href={`tel:${job.owner_info.phone}`} className="flex items-center gap-2 text-blue-500">
                  <Phone className="w-4 h-4" />
                  <span>{job.owner_info.phone}</span>
                </a>
              )}
              {job.owner_info.email && (
                <a href={`mailto:${job.owner_info.email}`} className="flex items-center gap-2 text-blue-500">
                  <Mail className="w-4 h-4" />
                  <span>{job.owner_info.email}</span>
                </a>
              )}
              {job.owner_info.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{job.owner_info.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insurance Info */}
        {job.insurance_info && job.insurance_info.company && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" /> Insurance Information
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{job.insurance_info.company}</p>
              </div>
              {job.insurance_info.claim_number && (
                <div>
                  <p className="text-gray-500">Claim Number</p>
                  <p className="font-medium text-gray-900">{job.insurance_info.claim_number}</p>
                </div>
              )}
              {job.insurance_info.policy_number && (
                <div>
                  <p className="text-gray-500">Policy Number</p>
                  <p className="font-medium text-gray-900">{job.insurance_info.policy_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Damage Description */}
        {job.damage_description && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" /> Damage Description
            </h2>
            <p className="text-sm text-gray-700">{job.damage_description}</p>
          </div>
        )}

        {/* Cost Information */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" /> Cost Information
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Estimated Cost</p>
              <p className="font-medium text-gray-900 text-lg">
                ${job.estimated_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Actual Cost</p>
              <p className="font-medium text-gray-900 text-lg">
                ${job.actual_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Photos */}
        {job.photos && job.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-500" /> Photos ({job.photos.length})
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((photo, index) => (
                <div key={photo.id || index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={`data:image/jpeg;base64,${photo.base64_data}`} 
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status History */}
        {job.status_history && job.status_history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Status History
            </h2>
            <div className="space-y-3">
              {job.status_history.slice().reverse().map((entry, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.status] || 'bg-gray-100'}`}>
                      {entry.status}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')}
                      {entry.changed_by && ` • ${entry.changed_by}`}
                    </p>
                    {entry.notes && <p className="text-gray-600 text-xs">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {job.activity_log && job.activity_log.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <button
              onClick={() => setShowActivityLog(!showActivityLog)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                📋 Activity Log ({job.activity_log.length})
              </h2>
              {showActivityLog ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showActivityLog && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {job.activity_log.slice().reverse().map((entry, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">{entry.action}</span>
                      <span className="text-gray-400 text-xs">
                        {format(new Date(entry.timestamp), 'dd MMM, HH:mm')}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">{entry.employee}</p>
                    {entry.details && <p className="text-gray-600 text-xs mt-1">{entry.details}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <p>Created: {format(new Date(job.created_at), 'dd MMM yyyy, HH:mm')}</p>
          <p>Updated: {format(new Date(job.updated_at), 'dd MMM yyyy, HH:mm')}</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Job?</h3>
            <p className="text-gray-500 text-sm mb-4">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
