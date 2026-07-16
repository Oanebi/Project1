import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, ScreenHeader, Button, EmptyState } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Package, Plus, Search, AlertTriangle, Package as PackageIcon } from 'lucide-react-native';

export default function InventoryScreen() {
  const router = useRouter();
  const { workspace, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const isOwner = role === 'owner';

  const loadProducts = useCallback(async () => {
    if (!workspace) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error loading products:', error.message);
    }
    setProducts(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [workspace]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.reorder_level
  ).length;

  const totalValue = products.reduce((sum, p) => sum + p.selling_price * p.quantity, 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Inventory"
        subtitle={workspace?.name}
        right={
          isOwner ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/add-product')}
            >
              <Plus size={22} color={colors.primary[600]} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Products</Text>
          <Text style={styles.statValue}>{products.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text style={[styles.statValue, { color: lowStockCount > 0 ? colors.warning[600] : colors.neutral[900] }]}>
            {lowStockCount}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Stock Value</Text>
          <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={colors.neutral[400]} strokeWidth={2} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={colors.neutral[400]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageIcon size={32} color={colors.neutral[400]} strokeWidth={1.5} />}
          title={search ? "No products found" : "No products yet"}
          subtitle={search ? "Try a different search term." : isOwner ? "Add your first product to get started." : "Your employer hasn't added any products yet."}
          actionLabel={isOwner && !search ? "Add Product" : undefined}
          onAction={isOwner && !search ? () => router.push('/(tabs)/add-product') : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isLow = item.quantity <= item.reorder_level;
            const isOut = item.quantity <= 0;
            return (
              <Card
                onPress={() => router.push(`/(tabs)/product/${item.id}`)}
                style={styles.productCard}
              >
                <View style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productMeta}>
                      {formatNumber(item.quantity)} {item.unit}
                      {'  ·  '}
                      {formatCurrency(item.selling_price)}
                    </Text>
                  </View>
                  <View style={[
                    styles.stockBadge,
                    isOut ? styles.stockOut : isLow ? styles.stockLow : styles.stockOk,
                  ]}>
                    {isOut ? (
                      <AlertTriangle size={12} color={colors.error[700]} strokeWidth={2.5} />
                    ) : isLow ? (
                      <AlertTriangle size={12} color={colors.warning[700]} strokeWidth={2.5} />
                    ) : null}
                    <Text style={[
                      styles.stockBadgeText,
                      isOut ? { color: colors.error[700] } : isLow ? { color: colors.warning[700] } : { color: colors.success[700] },
                    ]}>
                      {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[900],
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  stockOk: {
    backgroundColor: colors.success[50],
  },
  stockLow: {
    backgroundColor: colors.warning[50],
  },
  stockOut: {
    backgroundColor: colors.error[50],
  },
  stockBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
});
