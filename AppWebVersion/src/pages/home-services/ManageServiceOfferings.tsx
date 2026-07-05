import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { homeServicesApi, type ServiceCategory, type ServiceOffering } from '../../api/homeServicesApi';
import { formatPrice } from '../../utils/formatPrice';

interface Props {
  onChanged?: () => void;
}

export function ManageServiceOfferings({ onChanged }: Props) {
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [basePrice, setBasePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [o, c] = await Promise.all([
        homeServicesApi.getMyOfferings(),
        homeServicesApi.getCategories(),
      ]);
      setOfferings(o);
      setCategories(c);
      if (c.length && !categoryId) setCategoryId(c[0].id);
    } catch {
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || !categoryId) {
      alert('Enter a service name and category.');
      return;
    }
    try {
      setSaving(true);
      await homeServicesApi.createOffering({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        basePrice: basePrice ? parseFloat(basePrice) : undefined,
      });
      setShowForm(false);
      setName('');
      setDescription('');
      setBasePrice('');
      await load();
      onChanged?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offering: ServiceOffering) => {
    await homeServicesApi.updateOffering(offering.id, { isActive: !offering.isActive });
    await load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      ) : (
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
          <p className="font-semibold text-gray-900">New Service</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <p className="text-xs font-medium text-gray-600">Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  categoryId === c.id ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <input value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="Duration (minutes)" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Base price (optional)" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
            <button type="button" onClick={handleCreate} disabled={saving} className="flex-1 py-2 bg-sky-500 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {offerings.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-semibold text-gray-700">No services yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your first service so customers can book you.</p>
        </div>
      ) : (
        offerings.map((o) => (
          <div key={o.id} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{o.name}</p>
              <p className="text-xs text-gray-500">{o.category?.name} · {o.durationMinutes} min</p>
              {o.basePrice != null && (
                <p className="text-sm font-semibold text-sky-600 mt-0.5">
                  From {formatPrice(Number(o.basePrice), 'GMD')}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={o.isActive} onChange={() => toggleActive(o)} className="rounded" />
              Active
            </label>
          </div>
        ))
      )}
    </div>
  );
}
