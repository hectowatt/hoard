# ベースイメージとしてNode.jsを使用
FROM node:22.14.0

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./
COPY ./packages/backend/package*.json ./packages/backend/
COPY ./packages/frontend/package*.json ./packages/frontend/

# 依存関係のインストール
RUN npm install

# ソースコードをコピー
COPY . .

# ポート開放
EXPOSE 3500 4000