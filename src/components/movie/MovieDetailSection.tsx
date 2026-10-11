import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

/**
 * Einheitlicher, linksbuendiger Abschnitt des Film-Details: optionale kleine
 * Versalien-Ueberschrift, gleiche Abstaende (`py-4`) und eine duenne Trennlinie
 * OBEN (`withDivider`). Der Aufrufer setzt `withDivider` an jedem sichtbaren
 * Abschnitt ausser dem ersten, damit Linien nur ZWISCHEN sichtbaren Abschnitten
 * stehen (nie haengend, nie doppelt).
 */
export const MOVIE_DETAIL_SECTION_LABEL_CLASSNAME =
  "text-xs uppercase tracking-widest text-text-secondary";

/** EIN gemeinsamer Abstand: Abschnitt oben/unten py-4, Ueberschrift -> Inhalt gap-2. */
export const MOVIE_DETAIL_SECTION_PADDING_CLASSNAME = "py-4";
export const MOVIE_DETAIL_SECTION_GAP_CLASSNAME = "gap-2";

export interface MovieDetailSectionProps {
  /** Kurzname fuer die testID `movie-detail-section-<name>`. */
  name: string;
  /** Ueberschrift (Versalien per CSS); ohne Titel kein Kopf (Abschnitt "Info"). */
  title?: string;
  withDivider?: boolean;
  children: ReactNode;
}

export function MovieDetailSection({
  name,
  title,
  withDivider = false,
  children,
}: MovieDetailSectionProps) {
  return (
    <View
      testID={`movie-detail-section-${name}`}
      className={`items-start ${MOVIE_DETAIL_SECTION_GAP_CLASSNAME} ${MOVIE_DETAIL_SECTION_PADDING_CLASSNAME}${
        withDivider ? " border-t border-glass-border" : ""
      }`}
    >
      {title ? (
        <Text
          testID={`movie-detail-section-${name}-title`}
          className={MOVIE_DETAIL_SECTION_LABEL_CLASSNAME}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
