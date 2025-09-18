// get-refresh-token.mjs
import express from "express";
import open from "open";
import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "YOUR_CLIENT_ID_HERE";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "YOUR_CLIENT_SECRET_HERE";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://mail.google.com/"];

const app = express();

app.get("/", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.send(`<a href="${url}" target="_blank">點我授權 Google 帳號</a>`);
  console.log("請打開以下網址完成授權：\n", url);
  open(url);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.send("沒有收到 code！");
    return;
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("\n=== ✅ 你的 Refresh Token ===\n", tokens.refresh_token);
    res.send("授權完成！請回到終端機查看 Refresh Token。");
    process.exit(0);
  } catch (err) {
    console.error("取得 Refresh Token 失敗：", err);
    res.send("發生錯誤，請查看終端機。");
  }
});

app.listen(3000, () => {
  console.log("🚀 請在瀏覽器打開 http://localhost:3000 開始流程");
});
