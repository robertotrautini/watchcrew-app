import {
  Fragment,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";

interface DraftSheetContextValue {
  onCancel: () => void;
}
const DraftSheetContext = createContext<DraftSheetContextValue | null>(null);

export interface DraftSheetProps {
  visible: boolean;
  title?: string;
  /** Cancel button, backdrop tap, close button and hardware back: discards the draft. Also the close after a successful save. */
  onCancel: () => void;
  /**
   * Changes the draft identity without closing (e.g. another entry id): the content is
   * remounted, so no draft leaks across entries.
   */
  resetKey?: string | number | null;
  /** The form: a component that owns the draft state and renders a `DraftSheetForm`. */
  children?: ReactNode;
}

/**
 * Flyout with a draft: pick/type only changes local state, "Speichern" persists it,
 * "Abbrechen"/backdrop/back discards it. Built on `ui/Sheet`.
 *
 * Draft reset without effects: the draft state lives in the child (the form component), which
 * is freshly mounted every time the sheet opens (Sheet renders nothing while closed) and
 * remounted when `resetKey` changes. So there is no setState-in-effect reset anywhere.
 */
export function DraftSheet({
  visible,
  title,
  onCancel,
  resetKey = null,
  children,
}: DraftSheetProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <DraftSheetContext.Provider value={{ onCancel }}>
        <Fragment key={String(resetKey)}>{children}</Fragment>
      </DraftSheetContext.Provider>
    </Sheet>
  );
}

export interface DraftSheetFormProps {
  /** Form content (inputs); the footer is appended. */
  children?: ReactNode;
  /** testID of the form container. */
  testID?: string;
  /** Container spacing class. */
  className?: string;
  /**
   * Persists the draft. Return (or resolve) `true` to close the sheet afterwards;
   * `false`/`undefined` keeps it open (error, or the caller closes it itself).
   * A thrown error keeps it open.
   */
  onSave: () => boolean | void | Promise<boolean | void>;
  saveDisabled?: boolean;
  /** External pending state (mutation); the form also tracks its own pending `onSave`. */
  loading?: boolean;
  saveLabel?: string;
  saveIcon?: "save" | "add";
  /** `null` hides the cancel button. */
  cancelLabel?: string | null;
  /** Optional error line above the footer. */
  error?: string | null;
  errorTestID?: string;
  cancelTestID?: string;
  confirmTestID?: string;
  /** testID of the footer row. */
  actionsTestID?: string;
  /** Flex class of the save button inside the footer row. */
  saveClassName?: string;
  /** Extra action after Save, always rightmost (destructive actions). */
  extraAction?: ReactNode;
}

/** Content + footer of a `DraftSheet`; owns the Abbrechen (left) / Speichern (right) row. */
export function DraftSheetForm({
  children,
  testID,
  className = "gap-3",
  onSave,
  saveDisabled = false,
  loading = false,
  saveLabel = "Speichern",
  saveIcon = "save",
  cancelLabel = "Abbrechen",
  error = null,
  errorTestID,
  cancelTestID,
  confirmTestID,
  actionsTestID,
  saveClassName = "flex-1",
  extraAction,
}: DraftSheetFormProps) {
  const ctx = useContext(DraftSheetContext);
  const [saving, setSaving] = useState(false);

  function finish(ok: boolean | void) {
    if (ok === true) {
      ctx?.onCancel();
    }
  }

  function handleSave() {
    let result: boolean | void | Promise<boolean | void>;
    try {
      result = onSave();
    } catch {
      return;
    }
    if (!(result instanceof Promise)) {
      finish(result);
      return;
    }
    setSaving(true);
    result.then(
      (ok) => {
        setSaving(false);
        finish(ok);
      },
      () => setSaving(false),
    );
  }

  const showRow = cancelLabel != null || extraAction != null;
  const saveButton = (
    <Button
      testID={confirmTestID}
      label={saveLabel}
      icon={saveIcon}
      className={showRow ? saveClassName : undefined}
      disabled={saveDisabled}
      loading={loading || saving}
      onPress={handleSave}
    />
  );

  return (
    <View testID={testID} className={className}>
      {children}
      {error ? (
        <Text className="text-sm text-danger" testID={errorTestID}>
          {error}
        </Text>
      ) : null}
      {showRow ? (
        <View testID={actionsTestID} className="flex-row gap-3">
          {cancelLabel != null ? (
            <Button
              testID={cancelTestID}
              label={cancelLabel}
              icon="close"
              variant="secondary"
              className="flex-1"
              onPress={() => ctx?.onCancel()}
            />
          ) : null}
          {saveButton}
          {extraAction}
        </View>
      ) : (
        saveButton
      )}
    </View>
  );
}
