import React from "react";
import { Image, type ImageProps, type ImageSource } from "expo-image";

type RemoteImageProps = Omit<ImageProps, "source"> & {
  uri: string | null | undefined;
};

export default function RemoteImage({ uri, contentFit = "cover", ...props }: RemoteImageProps) {
  if (!uri || uri.startsWith("uploaded://")) return null;

  const source: ImageSource = { uri };

  return (
    <Image
      {...props}
      source={source}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={120}
    />
  );
}
