import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { ScreenBackdrop, rootBackdropLayout, screenBackdropLayout } from "@/components/ui/ScreenBackdrop";

describe("ScreenBackdrop", () => {
  it("renders a blurred, strongly dark-tinted layer", async () => {
    await render(<ScreenBackdrop />);
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByTestId("glass-blur-view")).toBeTruthy();
    expect(screen.getByTestId("glass-blur-tint").props.className).toContain("bg-black/70");
  });

  it("layout wrapper renders backdrop behind the children", async () => {
    await render(screenBackdropLayout({ route: { name: "movie/[tmdbId]" }, children: <Text>inhalt</Text> }));
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByText("inhalt")).toBeTruthy();
  });

  it("dim level is darker than calm", async () => {
    await render(<ScreenBackdrop level="dim" />);
    expect(screen.getByTestId("glass-blur-tint").props.className).toContain("bg-black/80");
  });

  it("modal settings routes get the dim backdrop", async () => {
    await render(screenBackdropLayout({ route: { name: "settings" }, children: <Text>inhalt</Text> }));
    expect(screen.getByTestId("screen-backdrop")).toBeTruthy();
    expect(screen.getByTestId("glass-blur-tint").props.className).toContain("bg-black/80");
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
