import { View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Skeleton for list screens while their query loads: card-shaped rows
 * (poster block left, three text lines right) in the size of the real sheet
 * cards (poster `w-24`, min height `h-36`) so nothing jumps when data arrives.
 */
export interface ListSkeletonProps {
  /** Number of placeholder rows (default 5). */
  rows?: number;
  testID?: string;
  className?: string;
}

export function ListSkeleton({
  rows = 5,
  testID,
  className = "",
}: ListSkeletonProps) {
  return (
    <View testID={testID} className={`w-full gap-3 px-4 pt-3 ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} className="h-36 flex-row gap-3">
          <Skeleton className="h-36 w-24 rounded-md" />
          <View className="flex-1 justify-center gap-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}
