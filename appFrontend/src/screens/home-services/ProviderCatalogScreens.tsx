import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { homeServicesApi, type ServiceOffering, type ServiceCategory } from '../../services/homeServicesApi';

const ACCENT = '#0EA5E9';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      Alert.alert('Required', 'Enter a service name and category.');
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
      } as any);
      setShowForm(false);
      setName('');
      setDescription('');
      setBasePrice('');
      await load();
      onChanged?.();
      Alert.alert('Added', 'Service offering created.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create service.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (offering: ServiceOffering) => {
    await homeServicesApi.updateOffering(offering.id, { isActive: !offering.isActive });
    await load();
    onChanged?.();
  };

  if (loading) return <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />;

  return (
    <ScrollView style={styles.container}>
      {!showForm ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
          <Text style={styles.addBtnText}>Add Service</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New Service</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Service name *" />
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" />
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipSelected]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={styles.input} value={durationMinutes} onChangeText={setDurationMinutes} placeholder="Duration (minutes)" keyboardType="number-pad" />
          <TextInput style={styles.input} value={basePrice} onChangeText={setBasePrice} placeholder="Base price (optional)" keyboardType="decimal-pad" />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {offerings.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptySub}>Add your first service so customers can book you.</Text>
        </View>
      ) : (
        offerings.map((o) => (
          <View key={o.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{o.name}</Text>
              <Text style={styles.cardMeta}>{o.category?.name} · {o.durationMinutes} min</Text>
              {o.basePrice != null && <Text style={styles.cardPrice}>From D{Number(o.basePrice).toLocaleString()}</Text>}
            </View>
            <Switch value={o.isActive} onValueChange={() => toggleActive(o)} trackColor={{ true: ACCENT }} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

export function ProviderAvailabilityEditor() {
  const [schedule, setSchedule] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    homeServicesApi.getMySchedule()
      .then((s) => {
        if (s.length === 0) {
          setSchedule([1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00', isEnabled: true })));
        } else {
          setSchedule(s.map((e) => ({ dayOfWeek: e.dayOfWeek, startTime: e.startTime, endTime: e.endTime, isEnabled: e.isEnabled })));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (dayOfWeek: number, patch: Partial<{ startTime: string; endTime: string; isEnabled: boolean }>) => {
    setSchedule((prev) => {
      const existing = prev.find((d) => d.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d));
      }
      return [...prev, { dayOfWeek, startTime: '09:00', endTime: '17:00', isEnabled: true, ...patch }];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await homeServicesApi.updateSchedule(schedule);
      Alert.alert('Saved', 'Your weekly schedule has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.hint}>Set your working hours. Customers can only book available slots within these times.</Text>
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const entry = schedule.find((s) => s.dayOfWeek === day) || { dayOfWeek: day, startTime: '09:00', endTime: '17:00', isEnabled: false };
        return (
          <View key={day} style={styles.scheduleRow}>
            <Switch
              value={entry.isEnabled}
              onValueChange={(v) => updateDay(day, { isEnabled: v })}
              trackColor={{ true: ACCENT }}
            />
            <Text style={styles.dayName}>{DAY_NAMES[day]}</Text>
            {entry.isEnabled ? (
              <View style={styles.timeRow}>
                <TextInput style={styles.timeInput} value={entry.startTime} onChangeText={(v) => updateDay(day, { startTime: v })} />
                <Text style={styles.timeSep}>–</Text>
                <TextInput style={styles.timeInput} value={entry.endTime} onChangeText={(v) => updateDay(day, { endTime: v })} />
              </View>
            ) : (
              <Text style={styles.closedText}>Closed</Text>
            )}
          </View>
        );
      })}
      <TouchableOpacity style={styles.saveBtnFull} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Schedule</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', marginBottom: 16 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  form: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#FFFFFF', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  chipRow: { marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cancelText: { color: '#6B7280', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: ACCENT },
  saveBtnFull: { marginTop: 16, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: ACCENT },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
  empty: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardPrice: { fontSize: 13, fontWeight: '600', color: ACCENT, marginTop: 4 },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 10 },
  dayName: { width: 36, fontSize: 14, fontWeight: '600', color: '#374151' },
  timeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 14, backgroundColor: '#FFFFFF', textAlign: 'center' },
  timeSep: { color: '#9CA3AF' },
  closedText: { flex: 1, fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});
