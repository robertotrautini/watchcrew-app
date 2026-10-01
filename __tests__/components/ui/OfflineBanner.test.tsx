import { onlineManager } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react-native";

import { OfflineBanner } from "@/components/ui/OfflineBanner";

describe("OfflineBanner", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("renders nothing while online", async () => {
    onlineManager.setOnline(true);
    await render(<OfflineBanner />);
    expect(screen.queryByText("Offline – gespeicherte Daten werden angezeigt")).toBeNull();
  });

  it("shows German copy when offline and hides again on reconnect", async () => {
    onlineManager.setOnline(false);
    await render(<OfflineBanner />);
    expect(screen.getByText("Offline – gespeicherte Daten werden angezeigt")).toBeTruthy();
    await act(async () => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByText("Offline – gespeicherte Daten werden angezeigt")).toBeNull();
  });
});
