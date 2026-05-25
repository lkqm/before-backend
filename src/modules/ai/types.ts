export type UploadedImage = {
  id: string;
  mimeType: string;
  buffer: Buffer;
};

export type ImageRankResult = {
  coverImageId: string;
  orderedImageIds: string[];
  reasons: Array<{
    imageId: string;
    reason: string;
  }>;
};
