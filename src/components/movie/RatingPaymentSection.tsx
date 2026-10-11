import { View } from "react-native";

import { DateField } from "@/components/ui/DateField";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { Text } from "@/components/ui/Text";
import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import type { GroupMemberRow } from "@/lib/groups";
import { formatDateForInput, parseGermanDateInput } from "@/lib/ratingLogic";

interface RatingPaymentSectionProps {
  groupMembers: GroupMemberRow[];
  selectedPayerId: string | null;
  onSelectPayer: (userId: string) => void;
  paymentDateInput: string;
  onChangePaymentDate: (input: string) => void;
}

/** "Wer hat bezahlt?": payer picker plus optional payment date (shown once a payer is chosen). */
export function RatingPaymentSection({
  groupMembers,
  selectedPayerId,
  onSelectPayer,
  paymentDateInput,
  onChangePaymentDate,
}: RatingPaymentSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icon name="price" size="S" color={PLACEHOLDER_COLOR} />
        <Text className="text-text-secondary">Wer hat bezahlt?</Text>
      </View>
      <Select
        testID="rating-dialog-payer-select"
        accessibilityLabel="Wer hat bezahlt?"
        options={groupMembers.map((member) => ({
          value: member.user_id,
          label: memberDisplayLabel(member.user_id, member.profiles?.display_name),
        }))}
        value={selectedPayerId}
        onChange={onSelectPayer}
        placeholder="Person wählen"
      />

      {selectedPayerId ? (
        <DateField
          testID="rating-dialog-payment-date-input"
          valueIso={parseGermanDateInput(paymentDateInput)}
          displayText={paymentDateInput}
          placeholder="Bezahlt am (TT.MM.JJJJ, optional)"
          onChangeIso={(iso) => onChangePaymentDate(formatDateForInput(iso))}
        />
      ) : null}
    </View>
  );
}
