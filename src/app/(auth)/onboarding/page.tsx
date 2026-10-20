import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ToastProvider } from "@/components/ui/toast";

export default function OnboardingRoute() {
  return (
    <ToastProvider>
      <OnboardingWizard />
    </ToastProvider>
  );
}
