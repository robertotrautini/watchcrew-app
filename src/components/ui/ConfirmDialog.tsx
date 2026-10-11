import type { ReactNode } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import type { IconRole } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";

export interface ConfirmDialogProps {
  visible: boolean;
  /** Prefix for testIDs: `${testID}-cancel-button`, `${testID}-confirm-button`, `${testID}-actions`. */
  testID: string;
  title: string;
  description?: string;
  /** Extra content between description and buttons (e.g. a confirmation input). */
  children?: ReactNode;
  /** Label of the destructive action (rightmost button). Default "Löschen". */
  confirmLabel?: string;
  confirmIcon?: IconRole;
  cancelLabel?: string;
  /** Spinner on the confirm button while the action runs. */
  loading?: boolean;
  confirmDisabled?: boolean;
  /** Cancel button, backdrop tap and back button. */
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The ONE confirmation dialog for every destructive action (docs/style-guide.md
 * "Destruktive Aktionen: immer ConfirmDialog"). Cancel left, danger action rightmost.
 */
export function ConfirmDialog({
  visible,
  testID,
  title,
  description,
  children,
  confirmLabel = "Löschen",
  confirmIcon = "delete",
  cancelLabel = "Abbrechen",
  loading = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <View testID={`${testID}-dialog`} className="gap-4">
        {description ? (
          <Text
            testID={`${testID}-description`}
            className="text-text-secondary"
          >
            {description}
          </Text>
        ) : null}
        {children}
        <View testID={`${testID}-actions`} className="flex-row gap-3">
          <Button
            testID={`${testID}-cancel-button`}
            label={cancelLabel}
            icon="close"
            variant="secondary"
            className="flex-1"
            onPress={onCancel}
          />
          <Button
            testID={`${testID}-confirm-button`}
            label={confirmLabel}
            icon={confirmIcon}
            variant="danger"
            className="flex-1"
            loading={loading}
            disabled={confirmDisabled}
            onPress={onConfirm}
          />
        </View>
      </View>
    </Sheet>
  );
}
