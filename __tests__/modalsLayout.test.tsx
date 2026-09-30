import { render } from "@testing-library/react-native";

const mockScreens: Array<{ name: string; options?: { title?: string } }> = [];

jest.mock("expo-router", () => {
  const Stack = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  Stack.Screen = (props: { name: string; options?: { title?: string } }) => {
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
});
