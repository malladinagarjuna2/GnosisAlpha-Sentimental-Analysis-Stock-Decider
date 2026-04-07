'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { preferencesAPI, postsAPI, alertsAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/dashboard/PostCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { TrendingUp, AlertCircle, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { data: preferences, loading: prefLoading } = useFetch(() =>
    preferencesAPI.getAll()
  );

  const { data: posts, loading: postsLoading } = useFetch(() =>
    postsAPI.getAll({ limit: 5 })
  );

  const { data: alerts, loading: alertsLoading } = useFetch(() =>
    alertsAPI.getAll()
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your market sentiment overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tracked Assets</p>
              <div className="text-2xl font-bold text-foreground">
                {prefLoading ? <Skeleton className="w-12 h-8" /> : preferences?.length || 0}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Latest Posts</p>
              <div className="text-2xl font-bold text-foreground">
                {postsLoading ? <Skeleton className="w-12 h-8" /> : posts?.length || 0}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <div className="text-2xl font-bold text-foreground">
                {alertsLoading ? <Skeleton className="w-12 h-8" /> : alerts?.length || 0}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts Feed */}
        <div className="lg:col-span-2">
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-border/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Recent Posts</h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {postsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : posts && posts.length > 0 ? (
                posts.map((post) => <PostCard key={post.id} post={post} />)
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No posts yet. Start tracking assets to see sentiment data.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Alerts Sidebar */}
        <div>
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden max-h-[600px] overflow-y-auto">
            <div className="p-6 border-b border-border/20 sticky top-0 bg-card/50">
              <h2 className="text-lg font-bold text-foreground">Alerts</h2>
            </div>
            <div className="divide-y divide-border/20">
              {alertsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No alerts. Enable alerts on tracked assets.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
