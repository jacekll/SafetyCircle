import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

interface SOSButtonProps {
  onEmergencyAlert: () => void;
  nickname: string;
}

export function SOSButton({ onEmergencyAlert, nickname }: SOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const { triggerEmergencyAlert, isSupported } = useHapticFeedback();

  const handlePress = () => {
    setIsPressed(true);
    
    // Trigger immediate haptic feedback when button is pressed
    if (isSupported) {
      triggerEmergencyAlert();
    }
    
    onEmergencyAlert();
    
    // Reset pressed state after animation
    setTimeout(() => setIsPressed(false), 200);
  };

  return (
    <div className="text-center">
      <div className="mb-4">
        <p className="text-sm text-gray-500 mt-1">Press the button below for emergency help</p>
      </div>
      
      {/* Main SOS Button */}
      <div className="relative inline-block">
        <Button
          onClick={handlePress}
          className={`w-48 h-48 bg-emergency hover:bg-emergency-dark rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emergency focus:ring-opacity-50 ${
            isPressed ? 'scale-95' : ''
          }`}
          aria-label="Emergency SOS Button"
        >
          <div className="text-center">
            <AlertTriangle className="text-white text-4xl mb-2 mx-auto" />
            <div className="text-white font-bold text-2xl">SOS</div>
            <div className="text-white text-sm opacity-90">EMERGENCY</div>
          </div>
        </Button>
        
        {/* Pulse effect overlay */}
        <div className="absolute inset-0 bg-emergency rounded-full animate-pulse opacity-20 pointer-events-none"></div>
      </div>
      
      <p className="text-xs text-gray-500 mt-4 max-w-xs mx-auto">
        This will send an immediate alert to all members in your groups
      </p>
    </div>
  );
}
