import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.LIRA_AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.LIRA_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.LIRA_AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.LIRA_AWS_S3_BUCKET_NAME || "lira-app-storage-2026";

export type S3Folder = "profiles" | "documents" | "banners" | "cases" | "public";

/**
 * 파일을 S3에 업로드하고 객체 URL을 반환합니다.
 * @param fileBuffer 파일 데이터 (Buffer 또는 Blob)
 * @param fileName 저장될 파일 이름
 * @param folder 저장될 폴더 경로
 * @param contentType 마임 타입
 * @param isPublic 공개 여부 (public-read 설정)
 */
export async function uploadToS3(
  fileBuffer: Buffer | Uint8Array | Blob,
  fileName: string,
  folder: S3Folder = "public",
  contentType: string = "application/octet-stream",
  isPublic: boolean = true
): Promise<string> {
  const key = `${folder}/${Date.now()}_${fileName}`;

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: isPublic ? "public-read" : "private",
      },
    });

    await upload.done();

    // S3 객체 URL 반환 (영구 주소)
    const region = process.env.LIRA_AWS_REGION || "ap-northeast-2";
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("[S3_UPLOAD_ERROR]", error);
    throw new Error("파일 업로드에 실패했습니다.");
  }
}

/**
 * 비공개 파일에 접근할 수 있는 임시 URL(Presigned URL)을 생성합니다.
 * @param s3Url S3 객체의 풀 URL (또는 Key)
 * @param expiresIn 만료 시간 (초 단위, 기본 1시간)
 */
export async function getPresignedUrl(s3Url: string, expiresIn: number = 3600): Promise<string> {
  try {
    // URL에서 Key 추출 (https://bucket.s3.region.amazonaws.com/key 형태 대응)
    let key = s3Url;
    if (s3Url.startsWith("http")) {
      const url = new URL(s3Url);
      key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("[S3_PRESIGNED_URL_ERROR]", error);
    return s3Url; // 실패 시 원본 URL 반환
  }
}

/**
 * Base64 데이터를 S3에 업로드합니다.
 * @param base64String data:image/png;base64,... 형태의 문자열
 * @param fileName 파일 이름
 * @param folder 폴더
 * @param isPublic 공개 여부
 */
export async function uploadBase64ToS3(
  base64String: string,
  fileName: string,
  folder: S3Folder = "public",
  isPublic: boolean = true
): Promise<string> {
  // Base64 포맷 확인 및 데이터 추출
  const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error("올바르지 않은 Base64 형식입니다.");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  return uploadToS3(buffer, fileName, folder, contentType, isPublic);
}
