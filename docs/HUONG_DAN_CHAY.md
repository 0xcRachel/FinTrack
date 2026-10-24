# Hướng dẫn chạy FinTrack trên Windows

## Lệnh chạy nhanh (đã cài công cụ và tạo database)

Bật MySQL trong Laragon, rồi mở **hai cửa sổ PowerShell**.

**Cửa sổ 1 — chạy backend:**

```powershell
cd D:\Fintrack
$env:JAVA_HOME = 'D:\tools\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;D:\tools\maven\bin;$env:Path"
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith('#')) {
            $pair = $line -split '=', 2
            if ($pair.Count -eq 2) {
                [Environment]::SetEnvironmentVariable($pair[0].Trim(), $pair[1].Trim(), 'Process')
            }
        }
    }
}
cd backend
mvn spring-boot:run
```

**Cửa sổ 2 — chạy giao diện:**

```powershell
cd D:\Fintrack\apps\desktop
if (!(Test-Path node_modules)) { npm.cmd ci }
npm.cmd run dev
```

Mở **http://localhost:1420**.

Nếu muốn mở cửa sổ ứng dụng desktop, dùng lệnh này thay cho `npm.cmd run dev` (cần cài Rust và C++ Build Tools):

```powershell
npm.cmd run tauri -- dev
```

---

Các lệnh bên dưới dùng **PowerShell**, với dự án đặt tại `D:\Fintrack`. Nếu lưu ở nơi khác, thay đường dẫn tương ứng.

## 1. Chuẩn bị

- JDK 21 và Maven 3.9 trở lên.
- Node.js 22 LTS và npm.
- MySQL 8 (có thể dùng MySQL trong Laragon).
- Nếu chạy ứng dụng desktop: cài thêm Rust/Cargo, Microsoft C++ Build Tools với thành phần **Desktop development with C++**, và Microsoft Edge WebView2 Runtime.

Kiểm tra các công cụ trong PowerShell:

```powershell
java -version
mvn -version
node -v
npm -v
mysql --version
```

Nếu dùng bộ Java/Maven portable đã ghi trong README, thiết lập cho cửa sổ PowerShell hiện tại:

```powershell
$env:JAVA_HOME = 'D:\tools\jdk-21'
$env:Path = "$env:JAVA_HOME\bin;D:\tools\maven\bin;$env:Path"
```

Nếu `mysql` chưa có trong PATH, dùng đường dẫn đầy đủ đến `mysql.exe` trong Laragon hoặc thêm thư mục `bin` của MySQL vào PATH.

## 2. Tạo cơ sở dữ liệu — chỉ cần làm lần đầu

Mở Laragon và khởi động dịch vụ MySQL. Sau đó đăng nhập bằng tài khoản có quyền tạo database và user:

```powershell
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -P 3306 -u root -p
```

Nhập mật khẩu MySQL khi được hỏi. Trong cửa sổ MySQL, chạy lần lượt:

```sql
SOURCE D:/Fintrack/database/01_create_database.sql;
SOURCE D:/Fintrack/database/02_create_tables.sql;
SOURCE D:/Fintrack/database/03_constraints_and_indexes.sql;
SOURCE D:/Fintrack/database/04_seed_development_data.sql;
EXIT;
```

Script đầu tạo database `fintrack` và tài khoản MySQL `fintrack`, mật khẩu phát triển ban đầu là `fintrack_dev`. Nếu tài khoản đã tồn tại, script giữ nguyên mật khẩu cũ. Script 04 thêm dữ liệu demo; không cần chạy lại mỗi lần mở ứng dụng.

## 3. Cấu hình môi trường — chỉ cần làm lần đầu

Tạo các file cấu hình nếu chưa có:

```powershell
Set-Location D:\Fintrack
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path apps\desktop\.env)) {
    Copy-Item apps\desktop\.env.example apps\desktop\.env
}
notepad .env
```

Sửa file `.env` tại thư mục gốc cho khớp MySQL đang dùng:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=fintrack
DB_USER=fintrack
DB_PASSWORD=fintrack_dev
BACKEND_PORT=8080
JWT_SECRET=thay-bang-chuoi-ngau-nhien-it-nhat-32-ky-tu
JWT_EXPIRATION_MS=1800000
```

Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên riêng có ít nhất 32 ký tự ASCII. Có thể tạo chuỗi bằng PowerShell rồi sao chép kết quả vào file:

```powershell
$jwtBytes = New-Object byte[] 48
$jwtRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRng.GetBytes($jwtBytes)
$jwtRng.Dispose()
[Convert]::ToBase64String($jwtBytes)
```

File `apps\desktop\.env` cần có:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

Backend hiện không tự đọc file `.env`; bước tiếp theo sẽ nạp các biến vào PowerShell. Vite tự đọc `.env` trong `apps\desktop`. Không đưa các file `.env` vào Git.

## 4. Chạy backend — cửa sổ PowerShell thứ nhất

Khởi động MySQL trước, sau đó chạy:

```powershell
Set-Location D:\Fintrack
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith('#')) {
        $pair = $line -split '=', 2
        if ($pair.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($pair[0].Trim(), $pair[1].Trim(), 'Process')
        }
    }
}
Set-Location backend
mvn spring-boot:run
```

Đoạn nạp trên dùng định dạng `TEN_BIEN=gia_tri` như mẫu, không bọc giá trị trong dấu nháy. Giữ cửa sổ này mở. Lần chạy đầu Maven cần tải thư viện.

Khi backend khởi động thành công, kiểm tra tại:

- API: <http://127.0.0.1:8080/api/v1/health>
- Kết nối database: <http://127.0.0.1:8080/api/v1/health/database>
- Swagger: <http://127.0.0.1:8080/swagger-ui.html>

Hai đường dẫn health cần trả về `status: "UP"`.

## 5. Chạy giao diện — cửa sổ PowerShell thứ hai

### Cách A: Mở trong trình duyệt

```powershell
Set-Location D:\Fintrack\apps\desktop
npm ci
npm run dev
```

Mở <http://localhost:1420>. Chỉ cần chạy lại `npm ci` khi cài lần đầu hoặc khi dependency/lockfile thay đổi.

### Cách B: Mở ứng dụng desktop Tauri

Sau khi cài đủ công cụ desktop ở bước 1:

```powershell
Set-Location D:\Fintrack\apps\desktop
npm ci
npm run tauri -- dev
```

Lệnh Tauri tự khởi động Vite rồi mở cửa sổ FinTrack. Lần biên dịch Rust đầu tiên có thể mất nhiều thời gian. Chọn một trong hai cách A/B mỗi lần chạy để tránh trùng cổng `1420`. Backend và MySQL vẫn cần chạy riêng.

## 6. Đăng nhập thử

Sau khi đã chạy script dữ liệu mẫu:

- Email: `demo@fintrack.local`
- Mật khẩu: `Demo@1234`

Bạn cũng có thể tạo tài khoản mới qua màn hình đăng ký.

## 7. Những lần chạy sau

1. Bật MySQL trong Laragon.
2. Mở PowerShell thứ nhất, nạp `.env` và chạy backend theo bước 4.
3. Mở PowerShell thứ hai, vào `D:\Fintrack\apps\desktop`, chạy `npm run dev` hoặc `npm run tauri -- dev`.
4. Dùng `Ctrl+C` trong từng cửa sổ để dừng tiến trình khi dùng xong.

## 8. Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
| --- | --- |
| Không nhận `java`, `mvn`, `node` hoặc `mysql` | Kiểm tra cài đặt và PATH; mở lại PowerShell sau khi thay đổi PATH. |
| PowerShell chặn `npm.ps1` | Dùng `npm.cmd` thay cho `npm` trong các lệnh. |
| `Access denied for user` | Kiểm tra `DB_USER`, `DB_PASSWORD` trong `.env`, rồi nạp lại biến và khởi động lại backend. Tài khoản đã tồn tại có thể dùng mật khẩu khác mật khẩu mẫu. |
| `Unknown database` hoặc lỗi Hibernate thiếu bảng/cột | Kiểm tra đã chạy đủ các script 01 → 04 đúng database. Với database có dữ liệu cũ, sao lưu trước khi xử lý khác biệt schema. |
| Không kết nối được MySQL | Kiểm tra dịch vụ MySQL đã chạy, cùng host và cổng trong `.env`. |
| Cổng `8080` đang được dùng | Dừng tiến trình cũ hoặc đổi `BACKEND_PORT`; nếu đổi, cập nhật `VITE_API_BASE_URL` rồi khởi động lại giao diện. |
| Cổng `1420` đang được dùng | Dừng phiên Vite/Tauri cũ bằng `Ctrl+C`, sau đó chạy lại. |
| Giao diện không gọi được API | Kiểm tra endpoint health, URL API trong `apps\desktop\.env`, và khởi động lại Vite sau khi sửa file. |
| Tauri lỗi linker/MSVC | Kiểm tra C++ Build Tools và Rust toolchain MSVC đã được cài. |

## 9. Build và kiểm thử tùy chọn

Backend:

```powershell
Set-Location D:\Fintrack\backend
mvn test
mvn package
```

Frontend:

```powershell
Set-Location D:\Fintrack\apps\desktop
npm test
npm run build
```

Tạo bộ cài desktop:

```powershell
npm run tauri -- build
```

Chạy lệnh build desktop trong `apps\desktop`. Với cấu hình target mặc định, bộ cài nằm trong `apps\desktop\src-tauri\target\release\bundle`. Cấu hình Tauri hiện tại không đóng gói backend Java hoặc MySQL; máy sử dụng vẫn cần hai dịch vụ này.
