import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, scanAPI } from '../services/api';
import { ArrowLeft, Camera, Image as ImageIcon, Loader } from 'lucide-react';
import Layout from '../components/Layout';

export default function AddJob() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [registration, setRegistration] = useState('');
  const [vin, setVin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('');
  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  const tabs = ['Vehicle', 'Owner', 'Insurance', 'Job Details'];

  const handleScanPlate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result?.split(',')[1];
        if (base64) {
          const result = await scanAPI.scanPlate(base64);
          if (result.registration) setRegistration(result.registration);
          if (result.make) setMake(result.make);
          if (result.model) setModel(result.model);
          if (result.year) setYear(result.year);
          if (result.color) setColor(result.color);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Scan error:', error);
      alert('Failed to scan plate');
    } finally {
      setScanning(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!registration || !make || !model || !year) {
      alert('Please fill in vehicle details first');
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.create({
        car_info: { make, model, year, color, registration, vin },
        owner_info: { name: '', phone: '', email: '', address: '' },
        insurance_info: { company: '', claim_number: '', policy_number: '' },
        damage_description: '',
        status: 'New',
        photos: [],
      });
      navigate('/jobs');
    } catch (error) {
      alert('Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!registration || !make || !model || !year) {
      alert('Please fill in vehicle details');
      return;
    }

    setLoading(true);
    try {
      await jobsAPI.create({
        car_info: { make, model, year, color, registration, vin },
        owner_info: { name: ownerName, phone: ownerPhone, email: ownerEmail, address: ownerAddress },
        insurance_info: { company: insuranceCompany, claim_number: claimNumber, policy_number: policyNumber },
        damage_description: damageDescription,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        status: 'New',
        photos: [],
      });
      navigate('/jobs');
    } catch (error) {
      alert('Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={() => navigate(-1)} className="text-blue-500 font-medium flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Add New Job</h1>
          <div className="w-16"></div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === i
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-32">
        {/* Vehicle Tab */}
        {activeTab === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Vehicle Information</h2>
            
            {/* Scan Button */}
            <label className={`flex items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition ${
              scanning ? 'bg-gray-100' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
              <input type="file" accept="image/*" capture="environment" onChange={handleScanPlate} className="hidden" disabled={scanning} />
              {scanning ? (
                <>
                  <Loader className="w-5 h-5 text-gray-600 animate-spin" />
                  <span className="text-gray-600 font-medium">Analyzing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Scan Vehicle Plate</span>
                </>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Registration *"
                value={registration}
                onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                className="col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Make *"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Model *"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Year *"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="VIN (optional)"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Owner Tab */}
        {activeTab === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Owner Information</h2>
            <input
              type="text"
              placeholder="Full Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Address"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Insurance Information</h2>
            <input
              type="text"
              placeholder="Insurance Company"
              value={insuranceCompany}
              onChange={(e) => setInsuranceCompany(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Claim Number"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Policy Number"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Job Details Tab */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Job Details</h2>
            <textarea
              placeholder="Damage Description"
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <input
              type="number"
              placeholder="Estimated Cost ($)"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 space-y-3">
          {make && model && year && registration && (
            <button
              onClick={handleQuickCreate}
              disabled={loading}
              className="w-full py-3 bg-emerald-100 text-emerald-600 border border-emerald-500 rounded-xl font-semibold disabled:opacity-50"
            >
              ⚡ Quick Create (Add details later)
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-600 transition"
          >
            {loading ? 'Creating...' : '✓ Create Job'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
