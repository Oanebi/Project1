import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Card, ScreenHeader, Badge } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { LogOut, Store, Shield, Crown, User, ChevronRight, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { workspace, role, session, signOut } = useAuth();
  const isOwner = role === 'owner';

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" subtitle={workspace?.name} />

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Workspace</Text>
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary[50] }]}>
                <Store size={18} color={colors.primary[600]} strokeWidth={2} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{workspace?.name}</Text>
                <Text style={styles.cardSub}>Business workspace</Text>
              </View>
            </View>
            {isOwner && (
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: colors.accent[50] }]}>
                  <Shield size={18} color={colors.accent[600]} strokeWidth={2} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Invite Code</Text>
                  <Text style={styles.cardSub}>{workspace?.invite_code}</Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Role</Text>
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[
                styles.cardIcon,
                isOwner ? { backgroundColor: colors.primary[50] } : { backgroundColor: colors.neutral[100] },
              ]}>
                {isOwner ? (
                  <Crown size={18} color={colors.primary[600]} strokeWidth={2} />
                ) : (
                  <User size={18} color={colors.neutral[500]} strokeWidth={2} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{isOwner ? 'Owner' : 'Staff'}</Text>
                <Text style={styles.cardSub}>
                  {isOwner
                    ? 'Full access including cost & margin data'
                    : 'Can view stock and selling prices. Cost data is hidden.'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.neutral[100] }]}>
                <User size={18} color={colors.neutral[500]} strokeWidth={2} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{session?.user?.email}</Text>
                <Text style={styles.cardSub}>Signed in</Text>
              </View>
            </View>
          </Card>
        </View>

        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Staff Access</Text>
            <Card>
              <View style={styles.infoBanner}>
                <Info size={16} color={colors.primary[600]} strokeWidth={2} />
                <Text style={styles.infoText}>
                  Staff members can see product names, stock levels, and selling prices. They cannot see cost data, cost ledger entries, or margins — this is enforced server-side.
                </Text>
              </View>
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
            <Card style={styles.signOutCard}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: colors.error[50] }]}>
                  <LogOut size={18} color={colors.error[600]} strokeWidth={2} />
                </View>
                <Text style={styles.signOutText}>Sign Out</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[500],
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[600],
    lineHeight: 18,
  },
  signOutCard: {
    borderColor: colors.error[100],
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: colors.error[600],
  },
});
