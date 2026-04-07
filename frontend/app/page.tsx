'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [token, router]);

  return null;
}
