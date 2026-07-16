import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, ScreenHeader, EmptyState } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/format';
import { ShoppingCart, Plus } from 'lucide-react-native';

interface SaleWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  products: { name: string; unit: string } | null;
}

export default function SalesScreen() {
  const router = useRouter();
  const { workspace } = useAuth();
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSales = useCallback(async () => {
    if (!workspace) return;
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        created_at,
        products:product_id (name, unit)
      `)
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Error loading sales:', error.message);
    }
    setSales((data || []) as unknown as SaleWithProduct[]);
    setLoading(false);
    setRefreshing(false);
  }, [workspace]);

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [loadSales])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalUnits = sales.reduce((sum, s) => sum + Number(s.quantity), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sales"
        subtitle={workspace?.name}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/sales/select-product')}
          >
            <Plus size={22} color={colors.primary[600]} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Sales</Text>
          <Text style={styles.statValue}>{sales.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Units Sold</Text>
          <Text style={styles.statValue}>{formatNumber(totalUnits)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={32} color={colors.neutral[400]} strokeWidth={1.5} />}
          title="No sales recorded yet"
          subtitle="Record a sale from the inventory or tap the + button above."
          actionLabel="Record a Sale"
          onAction={() => router.push('/(tabs)/sales/select-product')}
        />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={styles.saleCard}>
              <View style={styles.saleRow}>
                <View style={styles.saleLeft}>
                  <View style={styles.saleIcon}>
                    <ShoppingCart size={16} color={colors.accent[600]} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.saleProduct} numberOfLines={1}>
                      {item.products?.name || 'Unknown product'}
                    </Text>
                    <Text style={styles.saleDate}>{formatDateTime(item.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleQty}>
                    -{formatNumber(item.quantity)} {item.products?.unit || ''}
                  </Text>
                  <Text style={styles.saleTotal}>{formatCurrency(item.total_price)}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginTop: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  saleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleProduct: {
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
  saleQty: {
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
});
