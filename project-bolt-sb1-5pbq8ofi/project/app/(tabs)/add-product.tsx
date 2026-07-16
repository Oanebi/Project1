import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { ArrowLeft } from 'lucide-react-native';

const UNITS = ['pcs', 'kg', 'g', 'box', 'bag', 'crate', 'litre', 'bundle', 'pair', 'roll'];

export default function AddProductScreen() {
  const router = useRouter();
  const { workspace } = useAuth();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!workspace) {
      setError('No workspace found.');
      return;
    }
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(sellingPrice) || 0;
    const reorder = parseFloat(reorderLevel) || 0;

    if (price < 0 || qty < 0 || reorder < 0) {
      setError('Values cannot be negative.');
      return;
    }

    setError(null);
    setLoading(true);
    const { error: insertError } = await supabase.from('products').insert({
      workspace_id: workspace.id,
      name: name.trim(),
      unit,
      quantity: qty,
      selling_price: price,
      reorder_level: reorder,
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Add Product</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.form}>
          <Input
            label="Product name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Flour (5kg bag)"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Unit of measurement</Text>
          <View style={styles.unitGrid}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, unit === u && styles.unitChipActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Current stock quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            keyboardType="numeric"
          />
          <Input
            label="Selling price (per unit)"
            value={sellingPrice}
            onChangeText={setSellingPrice}
            placeholder="0"
            keyboardType="numeric"
          />
          <Input
            label="Reorder level (low stock alert)"
            value={reorderLevel}
            onChangeText={setReorderLevel}
            placeholder="0"
            keyboardType="numeric"
            error={error || undefined}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button label="Save Product" onPress={handleSave} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  unitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
  },
  unitChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  unitChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[600],
  },
  unitChipTextActive: {
    fontFamily: 'Inter-SemiBold',
    color: colors.primary[700],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 24,
    borderTopColor: colors.neutral[100],
    borderTopWidth: 1,
  },
});
