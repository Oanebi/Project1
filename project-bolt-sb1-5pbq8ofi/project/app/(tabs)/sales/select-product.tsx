import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, ScreenHeader, EmptyState } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatNumber } from '@/lib/format';
import type { Product } from '@/lib/types';
import { ArrowLeft, Search, Package } from 'lucide-react-native';

export default function SelectProductScreen() {
  const router = useRouter();
  const { workspace } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    if (!workspace) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('name', { ascending: true });
    setProducts(data || []);
    setLoading(false);
  }, [workspace]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.neutral[700]} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Select Product</Text>
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
          icon={<Package size={32} color={colors.neutral[400]} strokeWidth={1.5} />}
          title={search ? "No products found" : "No products available"}
          subtitle={search ? "Try a different search." : "Add products to your inventory first."}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push(`/(tabs)/record-sale/${item.id}`)}
              style={styles.productCard}
            >
              <View style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.productMeta}>
                    {formatNumber(item.quantity)} {item.unit} in stock
                  </Text>
                </View>
                {item.quantity <= 0 && (
                  <View style={styles.outBadge}>
                    <Text style={styles.outBadgeText}>Out of stock</Text>
                  </View>
                )}
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
  outBadge: {
    backgroundColor: colors.error[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  outBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.error[700],
  },
});
