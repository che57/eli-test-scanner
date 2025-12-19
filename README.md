ELI Test Scanner

Backend (NestJS) + Mobile (Expo/React Native) project for scanning test strips and extracting QR codes.

Prerequisites
- Node.js >= 18 (LTS) and npm >= 9
- Git
- For mobile native builds: Xcode (iOS) or Android Studio (Android) if you run `expo prebuild` / native builds
- Docker & Docker Compose (optional — project includes `docker-compose.yml` for local dev)

Repository layout
- `/backend` — NestJS backend (TypeORM, Jimp, jsQR)
- `/mobile` — Expo React Native app
- `/uploads` — runtime folder for uploaded images and thumbnails

Setup (local)
1. Clone the repo
   ```bash
   git clone <repo-url>
   cd eli-test-scanner
   ```
2. Backend
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The backend runs on the port configured in the Nest app (check `backend/package.json` scripts).

3. Mobile (Expo)
   ```bash
   cd mobile
   npm install
   npx expo prebuild
   npx expo run
   ```
   - You will need to run native project `npx expo prebuild`
   - Use development build instead of Expo Go to run the mobile app, since react-native-vision-camera is not supported on Expo Go

Running with Docker Compose (optional)
If you prefer containers, use the provided compose file (make sure services are configured):
```bash
docker-compose up --build
```

Running tests
- Backend tests (Jest):
  ```bash
  cd backend
  npm test
  ```
- Mobile tests (Jest + React Native testing libs):
  ```bash
  cd mobile
  npm test
  ```

API Documentation (Backend)
Base path: `/test-strips`

- `POST /test-strips/upload` — Upload an image file (form field `image`)
  - Expects: multipart/form-data with `image` (JPEG). Max file size: 10MB.
  - Response (success):
    ```json
    {
      "id": "uuid",
      "status": "processed",
      "qrCode": "ELI-2024-ABC",
      "qrCodeValid": true,
      "processedAt": "2025-12-19T...Z",
      "isExpired": false,
      "expirationYear": 2024,
      "imageMetadata": {
         "size": 123456,
         "dimensions": "4032x3024",
         "mimeType": "image/jpeg",
         "extension": ".jpg"
      }
    }
    ```
  - Errors: `400 Bad Request` for invalid uploads (wrong format, corrupt image, dimension limits), `500` for unexpected server errors.

- `GET /test-strips/list?page=1&limit=20` — Paginated list of submissions
  - Query params: `page` (default 1), `limit` (default 10)
  - Response shape:
    ```json
    {
      "submissions": [
        {"id":"...","qrCode":"...","thumbnailUrl":"/uploads/thumbnails/...","createdAt":"...","status":"processed","isExpired":false}
      ],
      "page": 1,
      "limit": 10
    }
    ```

- `GET /test-strips/:id` — Get detailed submission by UUID
  - Returns `404` if not found.

Security & Best Practices implemented
- Uploads are limited to 10MB via Multer
- Controller performs basic content sniffing for JPEG magic bytes, and the service validates image readability with Jimp
- Repository uses TypeORM parameterized queries (no raw SQL) to avoid SQL injection
- Filenames are sanitized before use and thumbnails are stored in a configured `uploads/thumbnails` directory

Known limitations & assumptions
- Image MIME type can be spoofed; server performs basic magic-byte check and `Jimp.read()` as additional validation but it's not a deep binary verifier
- Thumbnails are generated as square 200×200 images (center crop/resize) — this may alter aspect ratio for some images
- No authentication is implemented for API endpoints (assumes a trusted environment)
- Database schema changes (indexes, columns) should be applied with migrations — current repo relies on TypeORM entities
- Mobile tests may need additional Babel/metro config to run on React Native 0.81.x; see mobile `jest.config.js`

Notes
- To enable native builds for the mobile app, run:
  ```bash
  cd mobile
  npx expo prebuild --platform ios
  npx expo prebuild --platform android
  ```
- To clean and regenerate native projects:
  ```bash
  npx expo prebuild --clean
  ```
