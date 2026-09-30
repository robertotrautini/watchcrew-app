import { Image as ExpoImage } from "expo-image";

const mockCssInterop = jest.fn();
jest.mock("nativewind", () => ({ cssInterop: (...args: unknown[]) => mockCssInterop(...args) }));

// Root cause guard: NativeWind only maps `className` -> `style` for
// components it knows about (react-native core, or registered via
// cssInterop). expo-image's Image wasn't registered, so `className="aspect-[2/3]
// w-full"` was silently dropped and posters rendered at 0 size on device.
// (Jest has no compiled NativeWind CSS, so the real className->style
// translation can't be observed here; the registration call is the contract.)
describe("ui/Image", () => {
  it("registers expo-image's Image with NativeWind so className maps to style", () => {
    const { Image } = require("@/components/ui/Image");
    expect(Image).toBe(ExpoImage);
    expect(mockCssInterop).toHaveBeenCalledWith(ExpoImage, { className: "style" });
  });
});
