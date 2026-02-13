import { Composition } from "remotion";
import {
  SkyBridgeDemo,
  SKYBRIDGE_DEFAULT_PROPS,
  SkyBridgeDemoSchema,
  getSkyBridgeDemoDurationInFrames,
} from "./SkyBridgeDemo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="SkyBridgeDemo"
      component={SkyBridgeDemo}
      fps={30}
      durationInFrames={1}
      width={1920}
      height={1080}
      defaultProps={SKYBRIDGE_DEFAULT_PROPS}
      schema={SkyBridgeDemoSchema}
      calculateMetadata={({ fps }) => ({
        durationInFrames: getSkyBridgeDemoDurationInFrames(fps),
      })}
    />
  );
};
