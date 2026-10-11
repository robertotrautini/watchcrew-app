import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { ScreenBackdrop, rootBackdropLayout, screenBackdropLayout } from "@/components/ui/ScreenBackdrop";

describe("ScreenBackdrop", () => {
  it("renders a flat dark layer (no blur)", async () => {
    await render(<ScreenBackdrop />);
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByTestId("screen-backdrop-surface").props.className).toContain("bg-bg-card-flat");
  });

  it("layout wrapper renders backdrop behind the children", async () => {
    await render(screenBackdropLayout({ route: { name: "movie/[tmdbId]" }, children: <Text>inhalt</Text> }));
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByText("inhalt")).toBeTruthy();
  });

  it("modal settings routes get the dim backdrop", async () => {
    await render(screenBackdropLayout({ route: { name: "settings" }, children: <Text>inhalt</Text> }));
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByText("inhalt")).toBeTruthy();
  });

  it("root layout dims auth/onboarding/join/callback but leaves the app shell (tabs) undimmed", async () => {
    await render(rootBackdropLayout({ route: { name: "(auth)" }, children: <Text>auth</Text> }));
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    screen.unmount();
    await render(rootBackdropLayout({ route: { name: "(app)" }, children: <Text>app</Text> }));
    expect(screen.getByText("app")).toBeTruthy();
    expect(screen.queryByTestId("screen-backdrop")).toBeNull();
  });
});
