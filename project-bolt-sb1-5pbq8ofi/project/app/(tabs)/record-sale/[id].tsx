import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatCurrency, formatNumber } from '@/lib/format';
import { ArrowLeft } from 'lucide-react-native';
import type { Product } from '@/lib/types';

export default function RecordSaleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace, session } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [fetching, setFetching] = useState(true);
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      setProduct(data as Product | null);
      setFetching(false);
    })();
  }, [id]);

  const qtyNum = parseFloat(quantity) || 0;
  const totalPrice = qtyNum * (product?.selling_price || 0);

  const handleSave = async () => {
    if (!product || !workspace) return;
    if (qtyNum <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (qtyNum > product.quantity) {
      setError(`Not enough stock. You only have ${formatNumber(product.quantity)} ${product.unit}.`);
      return;
    }

    setError(null);
    setLoading(true);

    const { error: saleError } = await supabase.from('sales').insert({
      product_id: product.id,
      workspace_id: workspace.id,
      quantity: qtyNum,
      unit_price: product.selling_price,
      total_price: totalPrice,
      sold_by: session?.user?.id || null,
    });

    if (saleError) {
      setLoading(false);
      setError(saleError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: product.quantity - qtyNum })
      .eq('id', product.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.back();
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Record Sale</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product?.name}</Text>
          <Text style={styles.productCurrent}>
            In stock: {formatNumber(product?.quantity || 0)} {product?.unit}
          </Text>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Selling price per {product?.unit}</Text>
          <Text style={styles.priceValue}>{formatCurrency(product?.selling_price || 0)}</Text>
        </View>

        <Input
          label={`Quantity sold (${product?.unit})`}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="0"
          keyboardType="numeric"
          error={error || undefined}
        />

        {qtyNum > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Stock after sale</Text>
              <Text style={[
                styles.summaryValue,
                (product?.quantity || 0) - qtyNum < 0 && { color: colors.error[600] },
              ]}>
                {formatNumber(Math.max(0, (product?.quantity || 0) - qtyNum))} {product?.unit}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total sale amount</Text>
              <Text style={[styles.summaryValue, { fontFamily: 'Inter-Bold' }]}>
                {formatCurrency(totalPrice)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Button label="Record Sale" onPress={handleSave} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  productInfo: {
    marginBottom: spacing.md,
  },
  productName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  productCurrent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: colors.accent[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.accent[700],
  },
  priceValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.accent[700],
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
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
