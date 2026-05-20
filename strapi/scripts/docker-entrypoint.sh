#!/bin/sh
set -e

# Chờ database sẵn sàng trước khi tiếp tục
DB_HOST=${DATABASE_HOST:-launchpad-db}
DB_PORT=${DATABASE_PORT:-5432}

echo "⏳ Đang chờ Database ($DB_HOST:$DB_PORT) khởi động..."
until node -e "
const net = require('net');
const client = net.createConnection({ host: '$DB_HOST', port: parseInt('$DB_PORT') }, () => {
  client.end();
  process.exit(0);
});
client.on('error', () => {
  process.exit(1);
});
" 2>/dev/null; do
  sleep 1
done
echo "✅ Database đã sẵn sàng kết nối!"

# Thực hiện seed dữ liệu tự động nếu biến SEED_DATA=true và chưa được seed lần nào
if [ "$SEED_DATA" = "true" ]; then
  FLAG_FILE="/opt/app/public/uploads/.seeded"
  if [ ! -f "$FLAG_FILE" ]; then
    echo "🌱 Phát hiện SEED_DATA=true và chưa từng được seed dữ liệu. Tiến hành tự động import dữ liệu mẫu..."
    if yarn strapi import -f ./data/export_20250116105447.tar.gz --force; then
      mkdir -p "$(dirname "$FLAG_FILE")"
      touch "$FLAG_FILE"
      echo "✅ Tự động seed dữ liệu mẫu thành công!"
    else
      echo "⚠️ Lỗi: Tiến trình tự động seed dữ liệu thất bại. Bạn có thể seed thủ công sau."
    fi
  else
    echo "ℹ️ Dữ liệu mẫu đã được seed trước đó. Bỏ qua bước seed."
  fi
fi

# Bắt đầu trả lại process chính để chạy ứng dụng (ở đây là lệnh yarn start)
# Lệnh exec "$@" đảm bảo Node.js sẽ bắt được tín hiệu SIGTERM khi tắt container
exec "$@"
