
const fs = require('fs');
const path = require('path');

// A minimal valid PDF with "LIONE Placeholder" text.
// This is a pre-calculated valid PDF to avoid xref issues.
const validPdfBase64 = 
  "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmogICUgdGhlIHBhZ2VzCjw8CiAgL1R5cGUgL1BhZ2VzCiAgL0tpZHMgWyAzIDAgUiBdCiAgL0NvdW50IDEKPj4KZW5kb2JqCgozIDAgb2JqICAlIGEgcGFnZQo8PAogIC9UeXBlIC9QYWdlCiAgL1BhcmVudCAyIDAgUgogIC9NZWRpYUJveCBbIDAgMCA1OTUuMjggODQxLjg5IF0KICAvQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqICAlIGNvbnRlbnQKPDwKICAvTGVuZ3RoIDQ5Cj4+CnN0cmVhbQpCVEQKL0YxIDEyIFRmCjcyIDcyMiBUZAooTElPTkUgRG9jdW1lbnQgKFBsYWNlaG9sZGVyKSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMTAgMDAwMDAgbgowMDAwMDAwMDYwIDAwMDAwIG4KMDAwMDAwMDE1NyAwMDAwMCBuCjAwMDAwMDAyNjUgMDAwMDAgbgp0cmFpbGVyCjw8CiAgL1NpemUgNQogIC9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozNjQKJSVFT0YK";

const files = [
  "LIONE 탐정 서비스 이용 약관_250310.pdf",
  "LIONE 탐정 윤리 서약서_250310.pdf"
];

const targetDir = path.join(__dirname, '../public/downloads');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

files.forEach(fileName => {
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(validPdfBase64, 'base64'));
  console.log(`Generated valid PDF: ${filePath}`);
});
