import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { ShieldCheck } from 'lucide-react-native';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message);
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your inventory</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          error={error && !password ? error : undefined}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          error={error && password ? error : undefined}
        />

        {error && !email && !password && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Button label="Sign In" onPress={handleSignIn} loading={loading} style={{ marginTop: spacing.sm }} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign up</Text>
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
    paddingTop: 80,
    paddingBottom: 40,
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
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.error[600],
    marginBottom: spacing.sm,
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
