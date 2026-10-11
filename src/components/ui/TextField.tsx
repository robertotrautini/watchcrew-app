import type { TextInputProps } from "react-native";

import { SURFACE_EDGE } from "@/components/ui/Surface";
import { TextInput } from "@/components/ui/Text";
import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends TextInputProps {
  /** Placement/size classes only (e.g. `flex-1`, `mt-2`). The look is fixed. */
  className?: string;
  /** Search field: search return key. Same look as every other field. */
  search?: boolean;
  /** Error state: danger border. */
  error?: boolean;
  /** Password field (sets secureTextEntry). */
  secure?: boolean;
}

/**
 * Shared field look: opaque `bg-field` fill (FIELD_FILL), 1dp `border-surface-border`, radius, >= 48dp.
 * No accent border and no focus colour change. THE text input of the app (docs/style-guide.md "Felder und Flächen").
 */
export const TEXT_FIELD_CLASSNAME = `min-h-touch-comfortable rounded-lg ${SURFACE_EDGE} bg-field px-4 py-3 text-base text-text-primary`;

export function TextField({ className, search, error, secure, multiline, ...rest }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor={PLACEHOLDER_COLOR}
      returnKeyType={search ? "search" : undefined}
      secureTextEntry={secure ? true : undefined}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : undefined}
      {...rest}
      className={cn(TEXT_FIELD_CLASSNAME, error && "border-danger", className)}
    />
  );
}
