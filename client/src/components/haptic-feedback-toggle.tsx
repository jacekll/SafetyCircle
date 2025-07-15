import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Smartphone, Vibrate } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export function HapticFeedbackToggle() {
  const { isSupported, triggerGeneral } = useHapticFeedback();
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Load saved preference from localStorage
    const savedPreference = localStorage.getItem('hapticFeedbackEnabled');
    if (savedPreference !== null) {
      setIsEnabled(JSON.parse(savedPreference));
    }
  }, []);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('hapticFeedbackEnabled', JSON.stringify(enabled));
    
    // Give immediate feedback when enabling
    if (enabled && isSupported) {
      triggerGeneral({ intensity: 'light' });
    }
  };

  // Don't show the toggle if haptic feedback is not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <Vibrate className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <Label htmlFor="haptic-feedback" className="text-sm font-medium">
            Haptic Feedback
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            Vibrate for emergency alerts and actions
          </p>
        </div>
      </div>
      <Switch
        id="haptic-feedback"
        checked={isEnabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}

// Export hook to check if haptic feedback is enabled
export function useHapticFeedbackEnabled() {
  const [isEnabled, setIsEnabled] = useState(true);
  const { isSupported } = useHapticFeedback();

  useEffect(() => {
    const savedPreference = localStorage.getItem('hapticFeedbackEnabled');
    if (savedPreference !== null) {
      setIsEnabled(JSON.parse(savedPreference));
    }
  }, []);

  return isSupported && isEnabled;
}