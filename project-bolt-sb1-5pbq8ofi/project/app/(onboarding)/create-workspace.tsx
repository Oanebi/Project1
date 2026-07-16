import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { Store } from 'lucide-react-native';

export default function CreateWorkspaceScreen() {
  const router = useRouter();
  const { session, refreshWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a business name.');
      return;
    }
    if (!session?.user?.id) {
      setError('No active session. Please sign in again.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: insertError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), owner_id: session.user.id });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await refreshWorkspace();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Store size={28} color={colors.primary[600]} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Name your business</Text>
        <Text style={styles.subtitle}>This is how your workspace will appear to you and your staff.</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Business name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ada's Bakery"
          autoCapitalize="words"
          error={error || undefined}
        />
        <Button label="Create Workspace" onPress={handleCreate} loading={loading} />
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
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
});
