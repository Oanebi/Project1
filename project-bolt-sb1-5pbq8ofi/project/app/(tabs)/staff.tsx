import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, ScreenHeader, EmptyState, Button, Badge } from '@/components/ui';
import { colors, spacing, radius } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { Users, Copy, RefreshCw, Crown, User, ShieldCheck } from 'lucide-react-native';

interface MemberWithEmail {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  email: string;
}

export default function StaffScreen() {
  const { workspace, role } = useAuth();
  const isOwner = role === 'owner';
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!workspace) return;
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id, role, joined_at, user_id')
      .eq('workspace_id', workspace.id)
      .order('joined_at', { ascending: true });
    if (error) {
      console.error('Error loading members:', error.message);
    }

    const membersData = data || [];
    const userIds = membersData.map((m) => m.user_id);
    let emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      if (usersData) {
        emailMap = Object.fromEntries(usersData.map((u: any) => [u.id, u.email]));
      }
    }

    const combined: MemberWithEmail[] = membersData.map((m: any) => ({
      id: m.id,
      role: m.role,
      joined_at: m.joined_at,
      user_id: m.user_id,
      email: emailMap[m.user_id] || 'Unknown',
    }));

    setMembers(combined);
    setLoading(false);
    setRefreshing(false);
  }, [workspace]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const copyCode = async () => {
    if (!workspace?.invite_code) return;
    await Clipboard.setStringAsync(workspace.invite_code);
    Alert.alert('Copied', `Invite code "${workspace.invite_code}" copied to clipboard.`);
  };

  const regenerateCode = () => {
    Alert.alert(
      'Regenerate invite code',
      'This will create a new invite code. The old code will no longer work. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setRegenerating(true);
            const { data, error } = await supabase.rpc('regenerate_invite_code', {
              p_workspace_id: workspace?.id,
            });
            setRegenerating(false);
            if (error) {
              Alert.alert('Error', error.message);
            } else if (data) {
              Alert.alert('New code generated', `Your new invite code is: ${data}`);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Staff" subtitle={workspace?.name} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Staff" subtitle={workspace?.name} />

      {isOwner && (
        <View style={styles.inviteSection}>
          <View style={styles.inviteCard}>
            <View style={styles.inviteHeader}>
              <ShieldCheck size={18} color={colors.primary[600]} strokeWidth={2} />
              <Text style={styles.inviteTitle}>Invite Code</Text>
            </View>
            <Text style={styles.inviteDesc}>
              Share this code with staff so they can join your workspace. Staff will see stock and selling prices, but never your costs.
            </Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{workspace?.invite_code || '------'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
                <Copy size={16} color={colors.primary[600]} strokeWidth={2} />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <Button
              label="Regenerate Code"
              onPress={regenerateCode}
              variant="secondary"
              loading={regenerating}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <Text style={styles.sectionCount}>{members.length}</Text>
      </View>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={32} color={colors.neutral[400]} strokeWidth={1.5} />}
          title="No members yet"
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card style={styles.memberCard}>
              <View style={styles.memberRow}>
                <View style={[
                  styles.memberAvatar,
                  item.role === 'owner' ? { backgroundColor: colors.primary[50] } : { backgroundColor: colors.neutral[100] },
                ]}>
                  {item.role === 'owner' ? (
                    <Crown size={18} color={colors.primary[600]} strokeWidth={2} />
                  ) : (
                    <User size={18} color={colors.neutral[500]} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
                  <Text style={styles.memberDate}>Joined {formatDate(item.joined_at)}</Text>
                </View>
                <Badge
                  label={item.role === 'owner' ? 'Owner' : 'Staff'}
                  color={item.role === 'owner' ? colors.primary[700] : colors.neutral[600]}
                  bg={item.role === 'owner' ? colors.primary[50] : colors.neutral[100]}
                />
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inviteCard: {
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  inviteTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary[800],
  },
  inviteDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[600],
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
  },
  codeText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.primary[700],
    letterSpacing: 4,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: radius.sm,
  },
  copyText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary[600],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[800],
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[400],
  },
  memberCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[900],
  },
  memberDate: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginTop: 2,
  },
});
