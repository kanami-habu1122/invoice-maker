// ============================================================
// invoice.js - 請求書データの構造・計算ロジック
// ============================================================
// このファイルの役割:
//   ・請求書データの「型（構造）」を定義する
//   ・明細行の小計・消費税・合計金額を計算する
//   ・一意なIDを生成する
// ============================================================


// ============================================================
// 請求書データの構造（設計図）
// ============================================================
// 実際のデータはこの構造のオブジェクトとして localStorage に保存される
//
// {
//   id:           '1710900000000',   // 一意ID（タイムスタンプ）
//   invoiceNumber: '2024-001',       // 請求番号
//   invoiceDate:  '2024-03-20',      // 請求日
//   dueDate:      '2024-04-30',      // 支払期限
//   subject:      'Web制作費（3月分）', // 件名
//
//   // 請求先
//   clientName:    '株式会社ABC',
//   clientPerson:  '田中 太郎',
//
//   // 請求元
//   senderName:    '山田 花子',
//   senderAddress: '東京都渋谷区...',
//   senderPhone:   '090-0000-0000',
//   senderEmail:   'hanako@example.com',
//   senderRegNum:  'T1234567890123',  // インボイス登録番号（任意）
//
//   // 明細行の配列
//   items: [
//     {
//       description: 'Webサイト制作',  // 品目・作業内容
//       quantity:    1,               // 数量
//       unitPrice:   200000,          // 単価（円）
//       taxRate:     10,              // 税率（0 / 8 / 10）
//     },
//     {
//       description: '追加修正',
//       quantity:    3,
//       unitPrice:   5000,
//       taxRate:     10,
//     }
//   ],
//
//   // 振込先
//   bankName:      '〇〇銀行',
//   branchName:    '渋谷支店',
//   accountType:   '普通',           // '普通' or '当座'
//   accountNumber: '1234567',
//   accountHolder: 'ヤマダ ハナコ',
//
//   notes:        '何かご不明な点がございましたらお気軽にご連絡ください。',
//
//   createdAt:    '2024-03-20T10:00:00.000Z', // 作成日時
//   updatedAt:    '2024-03-20T10:00:00.000Z', // 更新日時
// }


// ============================================================
// ID生成
// ============================================================

// 一意なIDを生成する
// Date.now() は現在時刻のミリ秒（例: 1710900000000）
// 同時に複数作ることはほぼないので、これで十分ユニークになる
function generateId() {
  return String(Date.now());
}


// ============================================================
// 空の請求書データを作る関数
// ============================================================
// 新規作成画面を開いたときの初期値として使う
function createEmptyInvoice() {
  const today = getTodayString();

  return {
    id:            generateId(),
    invoiceNumber: '',
    invoiceDate:   today,
    dueDate:       getNextMonthEnd(), // デフォルト: 翌月末
    subject:       '',

    // 請求先
    clientName:   '',
    clientPerson: '',

    // 請求元（storage.js の loadSettings() から自動入力）
    senderName:    '',
    senderZip:     '',
    senderAddress: '',
    senderAddress2: '',
    senderPhone:   '',
    senderEmail:   '',
    senderRegNum:  '',

    // 明細（最初から1行用意しておく）
    items: [
      { description: '', quantity: 1, unitPrice: 0, taxRate: 10 }
    ],

    // 振込先
    bankName:      '',
    branchName:    '',
    accountType:   '普通',
    accountNumber: '',
    accountHolder: '',

    notes:     '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


// ============================================================
// 計算ロジック
// ============================================================

// ------------------------------------------------------------
// 明細行1行の小計を計算する
// 引数: item = { quantity: 1, unitPrice: 200000, ... }
// 戻り値: 小計（数値）
// ------------------------------------------------------------
function calcItemSubtotal(item) {
  // 数量 × 単価 = 小計
  // Number() で文字列が混じっていても数値に変換する
  return Number(item.quantity) * Number(item.unitPrice);
}


// ------------------------------------------------------------
// 請求書全体の合計を計算する
// ------------------------------------------------------------
// 戻り値:
//   {
//     subtotal:   215000,  // 税抜き合計
//     tax8:        0,      // 8%分の消費税
//     tax10:      21500,   // 10%分の消費税
//     totalTax:   21500,   // 消費税合計
//     total:      236500,  // 税込み合計（請求金額）
//   }
// ------------------------------------------------------------
function calcTotals(items) {
  let subtotal = 0;
  let taxBase8  = 0; // 8%対象の税抜き合計
  let taxBase10 = 0; // 10%対象の税抜き合計

  // 各明細行を集計する
  items.forEach(item => {
    const lineTotal = calcItemSubtotal(item);
    subtotal += lineTotal;

    // 税率ごとに分けて集計する
    if (Number(item.taxRate) === 8) {
      taxBase8 += lineTotal;
    } else if (Number(item.taxRate) === 10) {
      taxBase10 += lineTotal;
    }
    // taxRate === 0 のとき（非課税）は何も加算しない
  });

  // 消費税を計算する
  // Math.floor() で小数点以下を切り捨て（日本の商慣習）
  const tax8  = Math.floor(taxBase8  * 0.08);
  const tax10 = Math.floor(taxBase10 * 0.10);
  const totalTax = tax8 + tax10;

  return {
    subtotal,
    tax8,
    tax10,
    totalTax,
    total: subtotal + totalTax,
  };
}


// ============================================================
// 日付ユーティリティ
// ============================================================

// 今日の日付を 'YYYY-MM-DD' 形式で返す
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// 翌月末の日付を 'YYYY-MM-DD' 形式で返す
// （支払期限のデフォルト値として使う）
function getNextMonthEnd() {
  const d = new Date();

  // 翌月の最終日を取得するテクニック:
  // 「翌々月の0日目」= 翌月の最終日 になる
  // 例: 3月の場合 → new Date(2024, 4, 0) = 2024年4月30日
  const nextMonthEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0);
  return nextMonthEnd.toISOString().slice(0, 10);
}


// ============================================================
// 数値フォーマット
// ============================================================

// 数値を「¥ 1,234,567」形式の文字列に変換する
// 引数: num = 1234567（数値）
// 戻り値: '¥1,234,567'（文字列）
function formatCurrency(num) {
  // Intl.NumberFormat は JavaScript 標準の数値フォーマッター
  // { style: 'currency', currency: 'JPY' } で円記号付きのフォーマットになる
  return new Intl.NumberFormat('ja-JP', {
    style:    'currency',
    currency: 'JPY',
  }).format(Number(num) || 0);
}

// カンマ区切りの数値文字列に変換する（¥なし）
// 例: 1234567 → '1,234,567'
function formatNumber(num) {
  return new Intl.NumberFormat('ja-JP').format(Number(num) || 0);
}
