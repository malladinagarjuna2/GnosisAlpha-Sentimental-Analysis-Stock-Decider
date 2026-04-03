'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { strategiesAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';

const categories = [
  'SOCIAL_BUZZ',
  'NEWS',
  'RUMOR',
  'WHALE_ACTIVITY',
];

export default function StrategyPage() {
  const { toast } = useToast();
  const { data: strategy, loading, refetch } = useFetch(() =>
    strategiesAPI.get()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(strategy || {});

  // Update form when strategy data loads
  const handleFormChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await strategiesAPI.update(formData);
      await refetch();
      toast({
        title: 'Success',
        description: 'Strategy settings updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold text-foreground">Strategy Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure your sentiment analysis thresholds and filters.
        </p>
      </div>

      <Card className="p-8 border-border/20 bg-card/50 backdrop-blur-sm space-y-8">
        {/* Impact Threshold */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            Impact Threshold: {formData?.impactThreshold || 0}
          </label>
          <Slider
            value={[formData?.impactThreshold || 70]}
            onValueChange={(value) =>
              handleFormChange('impactThreshold', value[0])
            }
            min={0}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            Only alerts with impact scores above this threshold will be shown.
          </p>
        </div>

        {/* Confidence Threshold */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            Confidence Threshold: {((formData?.confidenceThreshold || 0.6) * 100).toFixed(0)}%
          </label>
          <Slider
            value={[(formData?.confidenceThreshold || 0.6) * 100]}
            onValueChange={(value) =>
              handleFormChange('confidenceThreshold', value[0] / 100)
            }
            min={0}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            Minimum confidence level for sentiment analysis.
          </p>
        </div>

        {/* Sentiment Threshold */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            Sentiment Threshold: {((formData?.sentimentThreshold || 0.2) * 100).toFixed(0)}%
          </label>
          <Slider
            value={[(formData?.sentimentThreshold || 0.2) * 100]}
            onValueChange={(value) =>
              handleFormChange('sentimentThreshold', value[0] / 100)
            }
            min={0}
            max={100}
            step={5}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            Minimum sentiment score threshold.
          </p>
        </div>

        {/* Weights */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Sentiment Weight: {((formData?.sentimentWeight || 0.5) * 100).toFixed(0)}%
            </label>
            <Slider
              value={[(formData?.sentimentWeight || 0.5) * 100]}
              onValueChange={(value) =>
                handleFormChange('sentimentWeight', value[0] / 100)
              }
              min={0}
              max={100}
              step={5}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Impact Weight: {((formData?.impactWeight || 0.5) * 100).toFixed(0)}%
            </label>
            <Slider
              value={[(formData?.impactWeight || 0.5) * 100]}
              onValueChange={(value) =>
                handleFormChange('impactWeight', value[0] / 100)
              }
              min={0}
              max={100}
              step={5}
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-4 block">
            Alert Categories
          </label>
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category} className="flex items-center gap-3">
                <Checkbox
                  id={category}
                  checked={(formData?.categories || []).includes(category)}
                  onCheckedChange={(checked) => {
                    const currentCategories = formData?.categories || [];
                    const newCategories = checked
                      ? [...currentCategories, category]
                      : currentCategories.filter((c: string) => c !== category);
                    handleFormChange('categories', newCategories);
                  }}
                />
                <label
                  htmlFor={category}
                  className="text-sm text-foreground cursor-pointer"
                >
                  {category}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Positive Keywords
            </label>
            <textarea
              value={(formData?.keywordsPositive || []).join(', ')}
              onChange={(e) =>
                handleFormChange(
                  'keywordsPositive',
                  e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean)
                )
              }
              placeholder="bullish, moon, rocket, buy..."
              className="w-full p-3 rounded-lg bg-input border border-border text-foreground text-sm"
              rows={4}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">
              Negative Keywords
            </label>
            <textarea
              value={(formData?.keywordsNegative || []).join(', ')}
              onChange={(e) =>
                handleFormChange(
                  'keywordsNegative',
                  e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean)
                )
              }
              placeholder="bearish, crash, dump, sell..."
              className="w-full p-3 rounded-lg bg-input border border-border text-foreground text-sm"
              rows={4}
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Card>
    </div>
  );
}
