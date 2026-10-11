import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

/**
 * App-wide default text font = DM Sans. React Native needs one font family
 * per weight, so `font-sans` (400) and `font-sans-medium|semibold|bold` are
 * explicit family tokens (tailwind.config.js). These wrappers add `font-sans`
 * unless the className already picks a family (`font-title*` Outfit,
 * `font-sans*` DM Sans). Always import Text/TextInput
 * from here, not from react-native.
 */
const FAMILY_CLASS = /(^|\s)font-(title|sans)/;

export function withDefaultFont(className?: string): string {
  if (className != null && FAMILY_CLASS.test(className)) return className;
  return className ? `font-sans ${className}` : "font-sans";
}

export function Text({ className, ...props }: TextProps & { className?: string }) {
  return <RNText className={withDefaultFont(className)} {...props} />;
}

export function TextInput({ className, ...props }: TextInputProps & { className?: string }) {
  return <RNTextInput className={withDefaultFont(className)} {...props} />;
}
