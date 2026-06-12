import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

type Mode = 'login' | 'signup';

/**
 * 이메일 로그인/회원가입 (PLAN.md §3.1 — 회원가입/로그인)
 * Google·Apple OAuth는 클라우드 Supabase 전환 시 추가 (로컬에서는 이메일만)
 */
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: email.split('@')[0], native_lang: 'ko' } },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      // 성공 시 onAuthStateChange → 루트 레이아웃의 가드가 (tabs)로 전환
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-center text-6xl">🦉</Text>
        <Text className="mt-4 text-center text-2xl font-extrabold">Ted Duolingo</Text>
        <Text className="mt-1 text-center text-ink-sub">
          {mode === 'login' ? '다시 만나서 반가워요!' : '몇 초면 시작할 수 있어요'}
        </Text>

        <TextInput
          className="mt-8 rounded-2xl border-2 border-line bg-paper px-4 py-3.5 text-base"
          placeholder="이메일"
          placeholderTextColor={colors.inkSub}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="auth-email"
        />
        <TextInput
          className="mt-3 rounded-2xl border-2 border-line bg-paper px-4 py-3.5 text-base"
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor={colors.inkSub}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          testID="auth-password"
        />

        {error && (
          <Text className="mt-3 text-center font-semibold text-danger" testID="auth-error">
            {error}
          </Text>
        )}

        <Pressable
          className="mt-6 items-center rounded-2xl bg-brand py-4 active:opacity-80 disabled:opacity-50"
          onPress={submit}
          disabled={busy || !email || password.length < 6}
          testID="auth-submit"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-extrabold uppercase text-white">
              {mode === 'login' ? '로그인' : '회원가입'}
            </Text>
          )}
        </Pressable>

        <Pressable
          className="mt-4 items-center py-2 active:opacity-60"
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
          testID="auth-toggle"
        >
          <Text className="font-bold text-sky">
            {mode === 'login' ? '계정이 없나요? 회원가입' : '이미 계정이 있나요? 로그인'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
