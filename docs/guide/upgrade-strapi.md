# Nâng Cấp Strapi

Hướng dẫn cách cập nhật Strapi lên phiên bản mới một cách an toàn.

::: danger Backup trước khi làm bất cứ điều gì
**Luôn luôn** sao lưu mã nguồn và database trước khi chạy bất kỳ lệnh upgrade nào. Không có bước nào có thể hoàn tác nếu không có backup.
:::

---

## Chọn Loại Nâng Cấp

```
Bạn muốn nâng cấp loại gì?
        │
        ├── Sửa lỗi nhỏ (vá lỗi bảo mật)
        │   └── → Dùng: patch
        │
        ├── Tính năng mới (vẫn cùng đời Major)
        │   └── → Dùng: minor
        │
        └── Lên đời hoàn toàn (v4 → v5)
            └── → Dùng: minor trước, rồi major
```

---

## Các Lệnh Nâng Cấp

Chạy tại thư mục **gốc** của dự án (không phải trong `strapi/`):

### Cập nhật Patch — Vá lỗi

_Ví dụ: v5.38.0 → v5.38.9_

```bash
npx @strapi/upgrade patch
```

### Cập nhật Minor — Tính năng mới

_Ví dụ: v5.38.0 → v5.46.0_

```bash
npx @strapi/upgrade minor
```

### Nâng cấp Major — Lên đời

_Ví dụ: v4.x → v5.0_

::: warning Quy trình 2 bước bắt buộc
Không thể nhảy thẳng từ v4 cũ lên v5. Phải lên bản v4 mới nhất **trước**, rồi mới lên v5.
:::

```bash
# Bước 1: Lên bản Minor mới nhất của v4
npx @strapi/upgrade minor

# Bước 2: Lên v5
npx @strapi/upgrade major
```

### Cập nhật lên Latest _(tự động chọn)_

```bash
npx @strapi/upgrade latest
```

---

## Options Hữu Ích

| Flag        | Mô tả                                           | Ví dụ                                   |
| :---------- | :---------------------------------------------- | :-------------------------------------- |
| `--dry`     | Xem trước sẽ thay đổi gì, **không** ghi file    | `npx @strapi/upgrade major --dry`       |
| `-y`        | Bỏ qua tất cả câu hỏi xác nhận                  | `npx @strapi/upgrade minor -y`          |
| `--debug`   | Xem log chi tiết khi gặp lỗi                    | `npx @strapi/upgrade major --debug`     |
| `-p <path>` | Chỉ định thư mục Strapi (nếu không đứng ở root) | `npx @strapi/upgrade patch -p ./strapi` |

::: tip Nên dùng --dry trước
Chạy `--dry` để kiểm tra xem công cụ sẽ thay đổi file nào, sau đó mới chạy thật. Đây là cách an toàn nhất.
:::

---

## Chỉ Chạy Codemods _(Không đổi version)_

Nếu bạn chỉ muốn áp dụng các đoạn script tự động sửa code cũ theo chuẩn mới mà **không** cập nhật thư viện:

```bash
# Xem danh sách codemods có sẵn
npx @strapi/upgrade codemods ls

# Chọn và chạy từ danh sách
npx @strapi/upgrade codemods run
```

---

## Sau Khi Nâng Cấp

::: info Checklist sau upgrade

- [ ] Xem lại các file đã bị thay đổi bằng `git diff`
- [ ] Chạy `yarn develop` để kiểm tra Strapi có lỗi không
- [ ] Kiểm tra Admin Panel còn hoạt động bình thường
- [ ] Kiểm tra các API endpoint quan trọng còn trả đúng data không
      :::
