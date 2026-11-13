# Hoàng Hoa Ngọc — Portfolio

Graphic & Motion Designer portfolio (EN / VI). Static site: plain HTML, CSS and JavaScript, no build step.

## Xem trên máy / Run locally

- Windows: bấm đúp `Xem portfolio.bat`, hoặc chạy:
  ```
  powershell -ExecutionPolicy Bypass -File .\serve.ps1
  ```
  rồi mở http://localhost:8080
- Mở thẳng `index.html` bằng trình duyệt sẽ không chạy video/ảnh đúng cách, cần dùng server như trên.

## Đăng lên GitHub Pages / Publish with GitHub Pages

Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
Trang sẽ có địa chỉ dạng `https://yungyoung-hub.github.io/hoangoc.porfolio/`.

## Cấu trúc / Structure

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang chính |
| `assets/style.css`, `assets/main.js` | Giao diện và tương tác |
| `assets/i18n.js` | Nội dung tiếng Việt, mô tả từng mục |
| `assets/content.js` | Dự án nổi bật (case study) và tên/khách hàng của từng tác phẩm |
| `assets/projects/` | Ảnh riêng cho case study (quà Tết, NTT, OMO). Nội dung và thứ tự dự án nổi bật sửa trong `assets/content.js` (CASE_GROUPS, CASES) |
| `assets/posters/` | Ảnh poster cho video Motion (tạo bằng ffmpeg, cùng tên với video) |
| `assets/files.js` | Danh sách file trong các thư mục dự án (tạo tự động) |
| `assets/mockups/`, `assets/mockups.js` | Ảnh mockup (tạo tự động) |
| `about me/` | Ảnh chân dung |
| `Graphic/`, `Motion/`, `Packaging & Event Assets/` | Ảnh và video dự án — mỗi thư mục là một mục trên web |

## Thêm / sửa dự án / Updating work

1. Thêm hoặc xóa file trong `Graphic/`, `Motion/` hoặc `Packaging & Event Assets/`.
2. Thêm dòng chú thích (khách hàng + tên dự án) cho file mới trong `assets/content.js`. Với video mới, tạo poster: `ffmpeg -ss 2 -i "Motion/<tên>.mp4" -frames:v 1 -vf scale=720:-2 -q:v 4 "assets/posters/<tên>.jpg"`.
3. Chạy `powershell -ExecutionPolicy Bypass -File .\build-list.ps1` để cập nhật danh sách.
4. Với mục Packaging, chạy `powershell -ExecutionPolicy Bypass -File .\make-mockups.ps1` để tạo lại mockup.
5. Mockup flat-lay cho dự án nổi bật (bộ quà Tết Mở, NTT): chạy `python make-project-mockups.py`.
6. Mockup 3D (booth, hộp quà, sân khấu, màn LCD): chạy server, mở `booth-studio.html`, `gift-studio.html` hoặc `event-studio.html`, đợi chữ "Saved", rồi chạy lại bước 3.
