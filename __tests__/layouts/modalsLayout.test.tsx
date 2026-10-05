import { render } from "@testing-library/react-native";

const mockScreens: Array<{ name: string; options?: { title?: string; contentStyle?: { backgroundColor?: string } } }> = [];

const mockStackProps: { screenLayout?: unknown; screenOptions?: Record<string, unknown> } = {};

jest.mock("expo-router", () => {
  const Stack = ({ children, screenLayout, screenOptions }: { children?: React.ReactNode; screenLayout?: unknown; screenOptions?: Record<string, unknown> }) => {
    mockStackProps.screenLayout = screenLayout;
    mockStackProps.screenOptions = screenOptions;
    return <>{children}</>;
  };
  Stack.Screen = (props: { name: string; options?: { title?: string; contentStyle?: { backgroundColor?: string } } }) => {
    mockScreens.push(props);
    return null;
  };
  return { Stack };
});

// Root cause guard: modal routes without explicit header titles show their raw
// route names ("add-movie", "similar/[tmdbId]") in the native header.
describe("(modals) layout header titles", () => {
  beforeEach(() => {
    mockScreens.length = 0;
  });

  it("gives add-movie and similar/[tmdbId] German header titles", async () => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    await render(<ModalsLayout />);

    const titleFor = (name: string) => mockScreens.find((s) => s.name === name)?.options?.title;
    expect(titleFor("add-movie")).toBe("Film hinzufügen");
    expect(titleFor("similar/[tmdbId]")).toBe("Ähnliche Filme");
  });

  it.each([
    ["settings", "Einstellungen"],
    ["settings/streaming-services", "Meine Streaming-Dienste"],
    ["settings/display", "Darstellung"],
    ["settings/notifications", "Benachrichtigungen"],
    ["settings/delete-account", "Konto löschen"],
    ["collection/[collectionId]", "Filmreihe"],
    ["filmography/director/[personId]", "Filmografie: Regisseur"],
    ["filmography/actor/[personId]", "Filmografie: Schauspieler:in"],
    ["filmography/studio/[companyId]", "Filmografie: Studio"],
  ])("gives %s the German header title %s", async (name, title) => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    await render(<ModalsLayout />);

    expect(mockScreens.find((s) => s.name === name)?.options?.title).toBe(title);
  });

  it("uses backdrops (not per-screen contentStyle hacks) for settings routes", async () => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    await render(<ModalsLayout />);

    for (const name of ["settings", "settings/display", "group-settings"]) {
      expect(mockScreens.find((s) => s.name === name)?.options?.contentStyle).toBeUndefined();
    }
  });
});

describe("(modals) layout calm backdrop", () => {
  it("installs the backdrop screenLayout on the navigator", async () => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    const { CALM_BACKDROP_ROUTES, DIM_BACKDROP_ROUTES } = require("@/components/ui/ScreenBackdrop");
    await render(<ModalsLayout />);
    expect(mockStackProps.screenLayout).toBe(require("@/components/modalScreenLayout").modalScreenLayout);
    expect(CALM_BACKDROP_ROUTES).toEqual(expect.arrayContaining(["movie/[tmdbId]", "similar/[tmdbId]", "add-movie"]));
    expect(CALM_BACKDROP_ROUTES).not.toContain("settings");
    expect(DIM_BACKDROP_ROUTES).toEqual(expect.arrayContaining(["settings", "settings/delete-account", "group-settings"]));
  });
});

describe("(modals) layout back navigation", () => {
  it("enables the swipe-back gestures (iOS full screen) on every screen", async () => {
    const ModalsLayout = require("@/app/(app)/(modals)/_layout").default;
    await render(<ModalsLayout />);
    expect(mockStackProps.screenOptions).toMatchObject({ gestureEnabled: true, fullScreenGestureEnabled: true });
  });

  it("wraps every route in the Android back-swipe view and keeps the backdrop", async () => {
    const { modalScreenLayout } = require("@/components/modalScreenLayout");
    const { Text } = require("react-native");
    const tree = modalScreenLayout({ route: { name: "settings" }, children: <Text>x</Text> });
    expect(tree.type).toBe(require("@/components/BackSwipeView").BackSwipeView);
  });
});
