import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '@/lib/theme';
import { Store, UserPlus } from 'lucide-react-native';

export default function ChooseRoleScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Get started</Text>
        <Text style={styles.subtitle}>Are you creating a new business or joining an existing one?</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(onboarding)/create-workspace')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.primary[50] }]}>
            <Store size={32} color={colors.primary[600]} strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>I'm an owner</Text>
          <Text style={styles.cardDesc}>
            Create a new workspace for your business. You'll get an invite code to share with your staff.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => router.push('/(onboarding)/join-workspace')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.accent[50] }]}>
            <UserPlus size={32} color={colors.accent[600]} strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>I'm a staff member</Text>
          <Text style={styles.cardDesc}>
            Join an existing workspace using an invite code from your employer.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: 80,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 4,
  },
  cards: {
    gap: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.neutral[100],
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    lineHeight: 20,
  },
});
