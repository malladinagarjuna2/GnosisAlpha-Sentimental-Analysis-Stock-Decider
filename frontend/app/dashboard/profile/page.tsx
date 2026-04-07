'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { profileAPI } from '@/lib/api';
import { toast } from 'sonner';
import type { InvestorProfile, InvestHorizon } from '@/lib/types';
import { UserCog, Shield, Clock, Wallet, Save, CheckCircle2 } from 'lucide-react';

const HORIZON_OPTIONS: { value: InvestHorizon; label: string; desc: string }[] = [
  { value: 'SHORT_TERM', label: 'Short Term', desc: '< 3 months' },
  { value: 'MEDIUM_TERM', label: 'Medium Term', desc: '3-12 months' },
  { value: 'LONG_TERM', label: 'Long Term', desc: '> 1 year' },
];

const RISK_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ultra Conservative', color: 'text-blue-400' },
  2: { label: 'Very Conservative', color: 'text-blue-400' },
  3: { label: 'Conservative', color: 'text-cyan-400' },
  4: { label: 'Moderate Low', color: 'text-teal-400' },
  5: { label: 'Moderate', color: 'text-emerald-400' },
  6: { label: 'Moderate High', color: 'text-yellow-400' },
  7: { label: 'Growth', color: 'text-amber-400' },
  8: { label: 'Aggressive', color: 'text-orange-400' },
  9: { label: 'Very Aggressive', color: 'text-red-400' },
  10: { label: 'Maximum Risk', color: 'text-red-500' },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [risk, setRisk] = useState(5);
  const [horizon, setHorizon] = useState<InvestHorizon>('MEDIUM_TERM');
  const [capital, setCapital] = useState('100000');

  useEffect(() => {
    profileAPI.get()
      .then(res => {
        if (res.data) {
          setProfile(res.data);
          setRisk(res.data.riskTolerance);
          setHorizon(res.data.horizon);
          setCapital(String(res.data.capitalAmount));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileAPI.upsert({
        riskTolerance: risk,
        horizon,
        capitalAmount: parseFloat(capital) || 100000,
      });
      setProfile(res.data);
      toast.success('Profile saved successfully!');
    } catch {
      toast.error('Failed to save profile');
    }
    setSaving(false);
  };

  const riskInfo = RISK_LABELS[risk] || RISK_LABELS[5];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-accent/10 animate-pulse-glow">
          <UserCog className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Investor Profile</h1>
          <p className="text-muted-foreground text-sm">
            Configure your risk tolerance, horizon & capital for personalized strategies
          </p>
        </div>
      </div>

      {/* Risk Tolerance */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm card-hover">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Risk Tolerance</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conservative</span>
            <span className={`text-lg font-code font-bold ${riskInfo.color}`}>
              {risk}/10 — {riskInfo.label}
            </span>
            <span className="text-sm text-muted-foreground">Aggressive</span>
          </div>
          <Slider
            value={[risk]}
            onValueChange={([v]) => setRisk(v)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between px-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 <= risk ? 'bg-accent' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Horizon */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm card-hover">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Investment Horizon</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {HORIZON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setHorizon(opt.value)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                horizon === opt.value
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-border/20 hover:border-accent/40 hover:bg-card/80'
              }`}
            >
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              {horizon === opt.value && (
                <CheckCircle2 className="h-4 w-4 text-accent mt-2" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Capital */}
      <Card className="p-6 border-border/20 bg-card/50 backdrop-blur-sm card-hover">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Investment Capital</h2>
        </div>

        <div className="space-y-3">
          <Label htmlFor="capital" className="text-sm text-muted-foreground">
            Amount in INR (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-code">₹</span>
            <Input
              id="capital"
              type="number"
              value={capital}
              onChange={e => setCapital(e.target.value)}
              className="pl-8 font-code text-lg bg-background/50"
              placeholder="100000"
            />
          </div>
          <div className="flex gap-2">
            {['50000', '100000', '500000', '1000000'].map(amt => (
              <button
                key={amt}
                onClick={() => setCapital(amt)}
                className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-accent/20 transition-colors font-code"
              >
                ₹{parseInt(amt).toLocaleString('en-IN')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-6 text-base font-semibold gap-2"
        size="lg"
      >
        <Save className="h-5 w-5" />
        {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
      </Button>

      {profile && (
        <time
          dateTime={profile.updatedAt}
          className="block text-center text-xs text-muted-foreground"
          suppressHydrationWarning
        >
          Last updated: {new Date(profile.updatedAt).toLocaleString()}
        </time>
      )}
    </div>
  );
}
