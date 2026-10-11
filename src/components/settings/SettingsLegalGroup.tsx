import Constants from "expo-constants";

import { SettingsGroup } from "@/components/settings/SettingsGroup";
import type { IconRole } from "@/components/ui/Icon";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { openLegalUrl } from "@/lib/legalLinks";

/**
 * M11 part 2, Job 3 (ADR 0011) -- legal document rows. Not a `route` (these
 * don't navigate to an in-app screen): pressing one opens the configured URL
 * in the system browser, or -- while iubenda isn't set up and the config
 * still holds the placeholder default (see src/lib/legalLinks.ts) -- shows a
 * "Wird bald ergänzt" toast instead of a broken link.
 */
interface LegalSection {
  key: string;
  label: string;
  url: string | undefined;
  icon: IconRole;
}

function legalSections(): LegalSection[] {
  const extra = Constants.expoConfig?.extra as
    | { privacyPolicyUrl?: string; termsOfServiceUrl?: string }
    | undefined;

  return [
    {
      key: "privacy-policy",
      label: "Datenschutzerklärung",
      url: extra?.privacyPolicyUrl,
      icon: "document",
    },
    {
      key: "terms-of-service",
      label: "Nutzungsbedingungen",
      url: extra?.termsOfServiceUrl,
      icon: "document",
    },
  ];
}

export function SettingsLegalGroup() {
  return (
    <SettingsGroup testID="settings-legal-sections" title="Rechtliches">
      {legalSections().map((section) => (
        <SettingsRow
          key={section.key}
          testID={`settings-section-${section.key}`}
          icon={section.icon}
          label={section.label}
          onPress={() => openLegalUrl(section.url)}
        />
      ))}
    </SettingsGroup>
  );
}
