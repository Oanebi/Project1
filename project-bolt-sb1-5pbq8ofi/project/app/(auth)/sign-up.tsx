import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';
import { ShieldCheck } from 'lucide-react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <ShieldCheck size={36} color={colors.primary[600]} strokeWidth={2} />
        </View>
        <Text style={styles.brandName}>StockKeep</Text>
        <Text style={styles.tagline}>Protect your margins. Empower your team.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start managing your inventory securely</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />
        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          secureTextEntry
          error={error || undefined}
        />

        <Button label="Create Account" onPress={handleSignUp} loading={loading} style={{ marginTop: spacing.sm }} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign in</Text>
            </TouchableOpacity>
          </Link>
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
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[900],
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginTop: 4,
  },
  form: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary[600],
  },
});
