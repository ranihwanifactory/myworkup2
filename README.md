# 젊은인력 업무일지 - Vercel 배포 가이드

Vercel에 배포할 때 다음 설정을 확인해 주세요.

## 1. Vercel 프로젝트 설정
- **Framework Preset**: `Vite` (자동 감지됨)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: `20.x` 이상 (React 19 및 Vite 6 권장 사양)

## 2. 환경 변수 (Environment Variables)
프로젝트에 Gemini AI 기능을 추가하신 경우, Vercel 대시보드의 **Settings > Environment Variables**에서 다음 변수를 추가해야 합니다.
- `GEMINI_API_KEY`: 발급받으신 API 키

## 3. SPA 라우팅 설정
새로고침 시 404 에러가 발생하는 것을 방지하기 위해 `vercel.json` 파일이 루트 디렉토리에 포함되어 있습니다.

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 4. 문제 해결
배포 후 화면이 나오지 않는다면 Vercel의 **Deployments > [해당 배포] > Functions** 또는 **Build Logs**를 확인하여 에러 메시지를 확인해 주세요.
- **Node 버전 에러**: `package.json`의 `engines` 필드에 `node: >=20`이 설정되어 있는지 확인하세요.
- **빌드 에러**: 로컬에서 `npm run build`가 성공하는지 먼저 확인해 보세요.
