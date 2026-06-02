export const UPLOAD_POLICY = {
  maxFiles: 10,
  maxFileSizeMb: 10,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  image: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.86,
    rotateDegrees: 0,
  },
};

export const UPLOAD_POLICY_TEXT = {
  maxFileSize: `${UPLOAD_POLICY.maxFileSizeMb}MB 이하`,
  mimeSummary: "jpg, png, webp, pdf",
};
