import { beforeEach, describe, expect, it } from "vitest";
import { useAtlasSceneStore } from "../src/three/state/atlasSceneStore";

describe("atlasSceneStore camera state", () => {
  beforeEach(() => {
    useAtlasSceneStore.getState().regenerate(1337);
  });

  it("toggles follow mode", () => {
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(false);
    useAtlasSceneStore.getState().toggleCameraFollow();
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(true);
    useAtlasSceneStore.getState().toggleCameraFollow();
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(false);
  });

  it("setCameraFollow sets an explicit value regardless of current state", () => {
    useAtlasSceneStore.getState().setCameraFollow(true);
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(true);
    useAtlasSceneStore.getState().setCameraFollow(true);
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(true);
    useAtlasSceneStore.getState().setCameraFollow(false);
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(false);
  });

  it("requestCameraFocus increments the nonce even for the same target twice in a row", () => {
    useAtlasSceneStore.getState().requestCameraFocus("explorer");
    const first = useAtlasSceneStore.getState().cameraFocusRequest;
    expect(first).toEqual({ target: "explorer", nonce: 1 });

    useAtlasSceneStore.getState().requestCameraFocus("explorer");
    const second = useAtlasSceneStore.getState().cameraFocusRequest;
    expect(second).toEqual({ target: "explorer", nonce: 2 });
  });

  it("clearCameraFocus resets the request to null", () => {
    useAtlasSceneStore.getState().requestCameraFocus("capital");
    expect(useAtlasSceneStore.getState().cameraFocusRequest).not.toBeNull();
    useAtlasSceneStore.getState().clearCameraFocus();
    expect(useAtlasSceneStore.getState().cameraFocusRequest).toBeNull();
  });

  it("regenerate resets camera follow/focus state", () => {
    useAtlasSceneStore.getState().setCameraFollow(true);
    useAtlasSceneStore.getState().requestCameraFocus("explorer");
    useAtlasSceneStore.getState().regenerate(42);
    expect(useAtlasSceneStore.getState().cameraFollowExplorer).toBe(false);
    expect(useAtlasSceneStore.getState().cameraFocusRequest).toBeNull();
  });
});
