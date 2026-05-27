export type UploadedImage = {
  id: string;
  mimeType: string;
  buffer: Buffer;
  width?: number;
  height?: number;
  localScore?: number;
  clusterId?: string;
  flags?: string[];
};

export type ImageRankResult = {
  coverImageId: string;
  orderedImageIds: string[];
  reasons: Array<{
    imageId: string;
    reason: string;
  }>;
};

export type PickImagesResult = {
  imageSummary: string;
  plans: Array<{
    title: string;
    coverImageId: string;
    imageIds: string[];
    reason: string;
    caption: {
      style: "natural" | "daily" | "minimal";
      text: string;
    };
  }>;
  rejected: Array<{
    imageId: string;
    reason: string;
  }>;
};
