import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Button, ScreenHeader, Badge, EmptyState } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/format';
import type { Product, CostLedgerEntry, Sale } from '@/lib/types';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Lock,
  History,
  AlertTriangle,
} from 'lucide-react-native';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace, role } = useAuth();
  const isOwner = role === 'owner';

  const [product, setProduct] = useState<Product | null>(null);
  const [ledger, setLedger] = useState<CostLedgerEntry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const { data: prod } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setProduct(prod as Product | null);

    if (isOwner) {
      const { data: ledgerData } = await supabase
        .from('cost_ledger')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      setLedger(ledgerData || []);
    }

    const { data: salesData } = await supabase
      .from('sales')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    setSales(salesData || []);

    setLoading(false);
    setRefreshing(false);
  }, [id, isOwner]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete product',
      `Are you sure you want to delete "${product?.name}"? This will also delete all cost and sales records for this product.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              router.replace('/(tabs)');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Product" />
        <EmptyState
          icon={<Package size={32} color={colors.neutral[400]} strokeWidth={1.5} />}
          title="Product not found"
        />
      </View>
    );
  }

  const isLow = product.quantity <= product.reorder_level;
  const isOut = product.quantity <= 0;
  const cumulativeCost = ledger.reduce((sum, e) => sum + Number(e.total_cost), 0);
  const totalUnitsBought = ledger.reduce((sum, e) => sum + Number(e.quantity_added), 0);
  const totalUnitsSold = sales.reduce((sum, s) => sum + Number(s.quantity), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price), 0);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <ArrowLeft size={22} color={colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        {isOwner && (
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push(`/(tabs)/edit-product/${product.id}`)}
            >
              <Pencil size={18} color={colors.neutral[600]} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.error[50] }]} onPress={handleDelete}>
              <Trash2 size={18} color={colors.error[600]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.titleSection}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
              color={isOut ? colors.error[700] : isLow ? colors.warning[700] : colors.success[700]}
              bg={isOut ? colors.error[50] : isLow ? colors.warning[50] : colors.success[50]}
            />
            <Badge label={product.unit} color={colors.neutral[600]} bg={colors.neutral[100]} />
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Current Stock</Text>
            <Text style={styles.infoValue}>{formatNumber(product.quantity)}</Text>
            <Text style={styles.infoUnit}>{product.unit}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Selling Price</Text>
            <Text style={styles.infoValue}>{formatCurrency(product.selling_price)}</Text>
            <Text style={styles.infoUnit}>per {product.unit}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Reorder Level</Text>
            <Text style={styles.infoValue}>{formatNumber(product.reorder_level)}</Text>
            <Text style={styles.infoUnit}>{product.unit}</Text>
          </View>
        </View>

        {isOwner && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Lock size={16} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Cost Ledger</Text>
              <Text style={styles.ownerOnly}>Owner only</Text>
            </View>

            <Card style={styles.cumulativeCard}>
              <View style={styles.cumulativeRow}>
                <View>
                  <Text style={styles.cumulativeLabel}>Cumulative Cost</Text>
                  <Text style={styles.cumulativeValue}>{formatCurrency(cumulativeCost)}</Text>
                </View>
                <View style={styles.cumulativeRight}>
                  <Text style={styles.cumulativeLabel}>Total Bought</Text>
                  <Text style={styles.cumulativeValue}>{formatNumber(totalUnitsBought)} {product.unit}</Text>
                </View>
              </View>
            </Card>

            {ledger.length === 0 ? (
              <Text style={styles.emptyText}>No restocks recorded yet.</Text>
            ) : (
              ledger.map((entry) => (
                <Card key={entry.id} style={styles.ledgerItem}>
                  <View style={styles.ledgerRow}>
                    <View>
                      <Text style={styles.ledgerQty}>+{formatNumber(entry.quantity_added)} {product.unit}</Text>
                      <Text style={styles.ledgerDate}>{formatDateTime(entry.created_at)}</Text>
                      {entry.note && <Text style={styles.ledgerNote}>{entry.note}</Text>}
                    </View>
                    <View style={styles.ledgerRight}>
                      <Text style={styles.ledgerUnitCost}>{formatCurrency(entry.unit_cost)}/{product.unit}</Text>
                      <Text style={styles.ledgerTotal}>{formatCurrency(entry.total_cost)}</Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {!isOwner && (
          <View style={styles.costHiddenBanner}>
            <Lock size={16} color={colors.neutral[500]} strokeWidth={2} />
            <Text style={styles.costHiddenText}>
              Cost information is only visible to the business owner.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <ShoppingCart size={16} color={colors.neutral[600]} strokeWidth={2} />
          </View>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
        </View>

        <View style={styles.salesSummary}>
          <View style={styles.salesStat}>
            <Text style={styles.salesStatLabel}>Units Sold</Text>
            <Text style={styles.salesStatValue}>{formatNumber(totalUnitsSold)}</Text>
          </View>
          <View style={styles.salesStat}>
            <Text style={styles.salesStatLabel}>Revenue</Text>
            <Text style={styles.salesStatValue}>{formatCurrency(totalRevenue)}</Text>
          </View>
        </View>

        {sales.length === 0 ? (
          <Text style={styles.emptyText}>No sales recorded yet.</Text>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id} style={styles.saleItem}>
              <View style={styles.saleRow}>
                <View>
                  <Text style={styles.saleQty}>-{formatNumber(sale.quantity)} {product.unit}</Text>
                  <Text style={styles.saleDate}>{formatDateTime(sale.created_at)}</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleUnitPrice}>{formatCurrency(sale.unit_price)}/{product.unit}</Text>
                  <Text style={styles.saleTotal}>{formatCurrency(sale.total_price)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {isOwner && (
        <View style={styles.bottomBar}>
          <Button
            label="Restock"
            onPress={() => router.push(`/(tabs)/restock/${product.id}`)}
            variant="secondary"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Button
            label="Record Sale"
            onPress={() => router.push(`/(tabs)/record-sale/${product.id}`)}
            style={{ flex: 1 }}
          />
        </View>
      )}
      {!isOwner && (
        <View style={styles.bottomBar}>
          <Button
            label="Record Sale"
            onPress={() => router.push(`/(tabs)/record-sale/${product.id}`)}
            style={{ flex: 1 }}
          />
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  productName: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  infoValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  infoUnit: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[800],
    flex: 1,
  },
  ownerOnly: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.primary[600],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cumulativeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[100],
  },
  cumulativeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cumulativeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  cumulativeValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  cumulativeRight: {
    alignItems: 'flex-end',
  },
  ledgerItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ledgerQty: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  ledgerDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginTop: 2,
  },
  ledgerNote: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 2,
    fontStyle: 'italic',
  },
  ledgerRight: {
    alignItems: 'flex-end',
  },
  ledgerUnitCost: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  ledgerTotal: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  costHiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  costHiddenText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  salesSummary: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  salesStat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  salesStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  salesStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  saleItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleQty: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  saleDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleUnitPrice: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  saleTotal: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  emptyText: {
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginBottom: spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 24,
    borderTopColor: colors.neutral[100],
    borderTopWidth: 1,
  },
});
