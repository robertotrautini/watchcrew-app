import {
  modalKeyboardAvoidingBehavior,
  screenKeyboardAvoidingBehavior,
} from "@/lib/platformKeyboardAvoiding";

describe("screenKeyboardAvoidingBehavior", () => {
  it("returns 'padding' on iOS", () => {
    expect(screenKeyboardAvoidingBehavior("ios")).toBe("padding");
  });

  it("returns undefined on Android (relies on the platform's own adjustResize default)", () => {
    expect(screenKeyboardAvoidingBehavior("android")).toBeUndefined();
  });

  it("returns undefined on any other platform (e.g. web)", () => {
    expect(screenKeyboardAvoidingBehavior("web")).toBeUndefined();
  });
});

describe("modalKeyboardAvoidingBehavior", () => {
  it("returns 'padding' on iOS", () => {
    expect(modalKeyboardAvoidingBehavior("ios")).toBe("padding");
  });

  it("returns 'height' on Android (a Modal's own window doesn't get Activity-level adjustResize)", () => {
    expect(modalKeyboardAvoidingBehavior("android")).toBe("height");
  });

  it("returns 'height' on any other platform (e.g. web)", () => {
    expect(modalKeyboardAvoidingBehavior("web")).toBe("height");
  });
});
