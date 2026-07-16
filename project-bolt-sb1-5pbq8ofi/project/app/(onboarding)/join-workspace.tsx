import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { UserPlus } from 'lucide-react-native';

export default function JoinWorkspaceScreen() {
  const router = useRouter();
  const { refreshWorkspace } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Please enter an invite code.');
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('join_workspace', {
      p_invite_code: code.trim().toUpperCase(),
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (data) {
      await refreshWorkspace();
      router.replace('/(tabs)');
    } else {
      setError('Could not join workspace. Check your code and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <UserPlus size={28} color={colors.accent[600]} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Join a workspace</Text>
        <Text style={styles.subtitle}>Enter the 6-character invite code your employer shared with you.</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Invite code"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="e.g. AB12CD"
          error={error || undefined}
          autoCapitalize="none"
        />
        <Button label="Join Workspace" onPress={handleJoin} loading={loading} />
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
    backgroundColor: colors.accent[50],
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
