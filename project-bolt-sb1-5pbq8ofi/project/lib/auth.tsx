import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { Workspace, Role } from './types';

interface AuthState {
  session: Session | null;
  loading: boolean;
  workspace: Workspace | null;
  role: Role | null;
  refreshWorkspace: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  workspace: null,
  role: null,
  refreshWorkspace: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const loadWorkspace = useCallback(async (userId: string) => {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (member) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', member.workspace_id)
        .maybeSingle();
      setWorkspace(ws as Workspace | null);
      setRole(member.role as Role);
    } else {
      setWorkspace(null);
      setRole(null);
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (session?.user?.id) {
      await loadWorkspace(session.user.id);
    }
  }, [session, loadWorkspace]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setWorkspace(null);
    setRole(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        loadWorkspace(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        (async () => {
          await loadWorkspace(newSession.user.id);
          setLoading(false);
        })();
      } else {
        setWorkspace(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadWorkspace]);

  return (
    <AuthContext.Provider value={{ session, loading, workspace, role, refreshWorkspace, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
