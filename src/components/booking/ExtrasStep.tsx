'use client';

import { useBookingStore } from '@/store/booking-store';

export function ExtrasStep() {
  const selectedAddOns = useBookingStore((state) => state.selectedAddOns);
  const toggleAddOn = useBookingStore((state) => state.toggleAddOn);
  const nextStep = useBookingStore((state) => state.nextStep);
  const totalPrice = useBookingStore((state) => state.totalPrice);
  const totalDuration = useBookingStore((state) => state.totalDuration);
  const selectedService = useBookingStore((state) => state.selectedService);

  const selectedCount = selectedAddOns.filter((a) => a.selected).length;

  const handleSkip = () => {
    nextStep();
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Add Extras
        </h2>
        <p className="text-gray-500">
          Make your visit even more special
        </p>
      </div>

      {/* Current Totals Preview */}
      <div className="bg-[#FFF9F5] rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {selectedService?.name} (+ extras)
          </span>
          <div className="text-right">
            <span className="font-semibold text-gray-800">€{totalPrice}</span>
            <span className="text-gray-500 ml-2">• {totalDuration} min</span>
          </div>
        </div>
      </div>

      {/* Beauty Context */}
      <div className="mb-6 p-4 bg-gradient-to-r from-[#D4A59A]/5 to-[#D4A59A]/10 rounded-2xl border border-[#D4A59A]/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D4A59A]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💆</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">Turn your appointment into self-care</p>
            <p className="text-xs text-gray-500">Add a little extra relaxation. These treatments pair beautifully with your {selectedService?.name?.toLowerCase() || 'selected service'}.</p>
          </div>
        </div>
      </div>

      {/* Add-ons List */}
      <div className="space-y-3 mb-6">
        {selectedAddOns.map((addOn) => {
          const isSelected = addOn.selected;

          return (
            <button
              key={addOn.id}
              onClick={() => toggleAddOn(addOn)}
              className={`
                w-full flex items-center justify-between p-4 rounded-2xl 
                border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? 'border-[#D4A59A] bg-[#FFF9F5]' 
                  : 'border-gray-100 bg-white hover:border-[#D4A59A]'
                }
              `}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <div 
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center 
                    transition-all duration-200
                    ${isSelected 
                      ? 'border-[#D4A59A] bg-[#D4A59A]' 
                      : 'border-gray-300'
                    }
                  `}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-medium text-gray-800">{addOn.name}</h3>
                  <p className="text-sm text-gray-500">{addOn.description}</p>
                </div>
              </div>

              {/* Price & Duration */}
              <div className="text-right">
                <span className="font-semibold text-[#D4A59A]">+€{addOn.price}</span>
                {addOn.duration > 0 && (
                  <span className="text-sm text-gray-500 ml-1">• {addOn.duration} min</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="flex-1 py-4 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200"
        >
          Skip
        </button>

        {/* Continue Button */}
        <button
          onClick={handleSkip}
          className="flex-[2] py-4 bg-[#D4A59A] text-white font-semibold rounded-xl hover:bg-[#C47D6D] active:scale-[0.98] transition-all duration-200"
        >
          {selectedCount > 0 
            ? `Continue (+€${selectedAddOns.filter(a => a.selected).reduce((sum, a) => sum + a.price, 0)})`
            : 'Continue'
          }
        </button>
      </div>
    </div>
  );
}

export default ExtrasStep;