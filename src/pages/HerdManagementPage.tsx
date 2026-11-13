import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  MapPin, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  X 
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { Animal } from '../types';
import { formatCoordinates } from '../utils/geo';

export const HerdManagementPage: React.FC = () => {
  const { 
    animals, 
    addAnimal, 
    updateAnimal, 
    deleteAnimal, 
    setSelectedAnimalId, 
    setActiveTab, 
    deviceData, 
    deviceConnectivity 
  } = useCattleGuard();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SAFE' | 'BREACH' | 'OFFLINE'>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formDeviceId, setFormDeviceId] = useState<string>('esp32_gps_01');
  const [formBreed, setFormBreed] = useState<string>('Black Angus');
  const [formGender, setFormGender] = useState<'Cow' | 'Bull' | 'Heifer' | 'Calf'>('Cow');
  const [formWeight, setFormWeight] = useState<number>(480);
  const [formAvatarUrl, setFormAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=400&q=80');
  const [formNotes, setFormNotes] = useState<string>('');

  const openAddModal = () => {
    setEditingAnimal(null);
    setFormName('');
    setFormDeviceId(`esp32_gps_${String(animals.length + 1).padStart(2, '0')}`);
    setFormBreed('Black Angus');
    setFormGender('Cow');
    setFormWeight(500);
    setFormAvatarUrl('https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=400&q=80');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (animal: Animal) => {
    setEditingAnimal(animal);
    setFormName(animal.name);
    setFormDeviceId(animal.deviceId);
    setFormBreed(animal.breed);
    setFormGender(animal.gender);
    setFormWeight(animal.weightKg);
    setFormAvatarUrl(animal.avatarUrl);
    setFormNotes(animal.notes || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAnimal) {
      updateAnimal({
        ...editingAnimal,
        name: formName,
        deviceId: formDeviceId,
        breed: formBreed,
        gender: formGender,
        weightKg: Number(formWeight),
        avatarUrl: formAvatarUrl,
        notes: formNotes,
      });
    } else {
      addAnimal({
        name: formName || `Cattle Tag #${animals.length + 1}`,
        deviceId: formDeviceId,
        breed: formBreed,
        gender: formGender,
        weightKg: Number(formWeight),
        registrationDate: new Date().toISOString().split('T')[0],
        avatarUrl: formAvatarUrl,
        notes: formNotes,
        status: 'SAFE',
      });
    }
    setIsModalOpen(false);
  };

  const filteredAnimals = animals.filter((animal: Animal) => {
    const matchesSearch = 
      animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.breed.toLowerCase().includes(searchTerm.toLowerCase());

    const isPrimary = animal.deviceId === 'esp32_gps_01';
    const currentStatus = isPrimary && deviceData?.outside ? 'BREACH' : 'SAFE';

    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'BREACH') return matchesSearch && currentStatus === 'BREACH';
    if (filterStatus === 'SAFE') return matchesSearch && currentStatus === 'SAFE';
    if (filterStatus === 'OFFLINE') return matchesSearch && isPrimary && deviceConnectivity === 'OFFLINE';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card & Actions */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
            Livestock Registry & IoT Devices
          </h2>
          <p className="text-xs text-[#7A8980]">
            Manage individual cattle, assigned ESP32 collar tags, and geofence tracking
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#123C2D] hover:bg-[#1B523E] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#32A56C]" />
          <span>Register Animal</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, name, breed, or ESP32..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['ALL', 'SAFE', 'BREACH', 'OFFLINE'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-[#123C2D] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'ALL' ? 'All Herd' : status === 'SAFE' ? 'Inside Safe Zone' : status === 'BREACH' ? 'Breaches' : 'Offline'}
            </button>
          ))}
        </div>
      </div>

      {/* Herd Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAnimals.map((animal: Animal) => {
          const isPrimary = animal.deviceId === 'esp32_gps_01';
          const isOutside = isPrimary ? Boolean(deviceData?.outside) : false;
          const coords = isPrimary && deviceData?.latitude 
            ? formatCoordinates(deviceData.latitude, deviceData.longitude)
            : '23.11495° N, 72.58045° E';

          return (
            <div
              key={animal.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between ${
                isOutside ? 'border-red-300 ring-2 ring-red-100' : 'border-[#E3E8E3]'
              }`}
            >
              <div>
                {/* Header Image & Tag Badge */}
                <div className="relative h-44 w-full bg-gray-100">
                  <img
                    src={animal.avatarUrl}
                    alt={animal.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#123C2D]/90 text-white backdrop-blur-sm border border-[#32A56C]/40">
                      {animal.id}
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-1 ${
                      isOutside
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {isOutside ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      <span>{isOutside ? 'BREACH' : 'SAFE'}</span>
                    </span>
                  </div>

                  {/* Animal Name on Image */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white text-base font-bold drop-shadow-md">
                      {animal.name}
                    </h3>
                    <p className="text-gray-200 text-xs font-medium">
                      {animal.breed} &bull; {animal.gender}
                    </p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-[#F5F7F3]">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Hardware Collar</span>
                      <span className="font-mono font-bold text-[#123C2D] flex items-center gap-1 mt-0.5">
                        <Radio className="w-3 h-3 text-[#21865B]" />
                        {animal.deviceId}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#F5F7F3]">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Weight & Date</span>
                      <span className="font-bold text-[#202B26] flex items-center gap-1 mt-0.5">
                        <Scale className="w-3 h-3 text-gray-400" />
                        {animal.weightKg} kg
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block">Last Known Position</span>
                    <span className="font-mono text-gray-700 text-[11px]">
                      {coords}
                    </span>
                  </div>

                  {animal.notes && (
                    <p className="text-xs text-gray-500 italic line-clamp-2">
                      "{animal.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 pt-0 border-t border-gray-100 mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnimalId(animal.id);
                    setActiveTab('tracking');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#E8F4EC] text-[#123C2D] hover:bg-[#D7EEDF] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#21865B]" />
                  <span>Live Track</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(animal)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Edit Animal"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {animals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteAnimal(animal.id)}
                    className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove from Herd"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Register / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-modal border border-[#E3E8E3] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#F5F7F3]">
              <h3 className="text-sm font-bold text-[#202B26] font-['Manrope']">
                {editingAnimal ? 'Edit Animal Details' : 'Register New Livestock'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Animal Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bella (Angus #01)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    ESP32 Device ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formDeviceId}
                    onChange={(e) => setFormDeviceId(e.target.value)}
                    placeholder="esp32_gps_01"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Breed
                  </label>
                  <input
                    type="text"
                    required
                    value={formBreed}
                    onChange={(e) => setFormBreed(e.target.value)}
                    placeholder="Black Angus, Brahman, Holstein"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Gender / Category
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Cow' | 'Bull' | 'Heifer' | 'Calf')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                  >
                    <option value="Cow">Cow</option>
                    <option value="Bull">Bull</option>
                    <option value="Heifer">Heifer</option>
                    <option value="Calf">Calf</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Photo URL
                </label>
                <input
                  type="text"
                  value={formAvatarUrl}
                  onChange={(e) => setFormAvatarUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Health & Pasture Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Collar serial number, vaccination notes..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#123C2D] hover:bg-[#1B523E] text-white rounded-xl shadow-sm"
                >
                  {editingAnimal ? 'Save Changes' : 'Register Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
