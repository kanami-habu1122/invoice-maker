// ============================================================
// storage.js - データの保存・読み込み・削除（CRUD）
// ============================================================
// このファイルの役割:
//   ・請求書データを localStorage に保存・取得・削除する
//   ・プラン情報（無料/有料）を保存・取得する
//
// localStorage の基本:
//   保存: localStorage.setItem('キー', '値の文字列')
//   読込: localStorage.getItem('キー')  ← なければ null
//   削除: localStorage.removeItem('キー')
//   ※ オブジェクトは JSON.stringify() で文字列に変換してから保存する
//   ※ 読み込むときは JSON.parse() でオブジェクトに戻す
// ============================================================


// ------------------------------------------------------------
// キー名の定数（タイポミス防止のために定数化する）
// ------------------------------------------------------------
const STORAGE_KEY_INVOICES = 'invoice_maker_invoices'; // 請求書一覧
const STORAGE_KEY_PLAN     = 'invoice_maker_plan';     // プラン情報
const STORAGE_KEY_SETTINGS = 'invoice_maker_settings'; // ユーザー設定（請求元情報など）

// 無料プランの保存上限件数
const FREE_PLAN_LIMIT = 3;


// ============================================================
// 請求書の CRUD（作成・読込・更新・削除）
// ============================================================

// ------------------------------------------------------------
// 全件取得
// 戻り値: 請求書オブジェクトの配列（なければ空配列）
// ------------------------------------------------------------
function getInvoices() {
  const raw = localStorage.getItem(STORAGE_KEY_INVOICES);

  // データがなければ空配列を返す（null チェック）
  if (raw === null) return [];

  // 文字列 → オブジェクトに変換して返す
  return JSON.parse(raw);
}


// ------------------------------------------------------------
// 1件取得
// 引数: id - 請求書の一意ID（文字列）
// 戻り値: 請求書オブジェクト（見つからなければ null）
// ------------------------------------------------------------
function getInvoice(id) {
  const invoices = getInvoices();

  // find() は条件に合う最初の要素を返す。なければ undefined を返す
  // undefined を null に統一するため || null を付ける
  return invoices.find(inv => inv.id === id) || null;
}


// ------------------------------------------------------------
// 保存（新規作成 or 更新）
// 引数: invoice - 請求書オブジェクト（id を持っている）
// 戻り値: { success: true } or { success: false, reason: '...' }
// ------------------------------------------------------------
function saveInvoice(invoice) {
  const invoices = getInvoices();
  const plan     = getPlan();

  // 既存データかどうか確認する（同じ id が配列にあれば「更新」）
  const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
  const isNew = existingIndex === -1; // -1 = 見つからなかった = 新規

  // 新規保存のとき、無料プランの件数制限をチェックする
  if (isNew && plan === 'free' && invoices.length >= FREE_PLAN_LIMIT) {
    // 制限に引っかかった → 保存せずに失敗を返す
    return { success: false, reason: 'limit_reached' };
  }

  if (isNew) {
    // 新規: 配列の先頭に追加する（一覧で新しい順に表示するため）
    invoices.unshift(invoice);
  } else {
    // 更新: 既存のデータを上書きする
    invoices[existingIndex] = invoice;
  }

  // 配列全体を文字列に変換して保存する
  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));

  return { success: true };
}


// ------------------------------------------------------------
// 削除
// 引数: id - 削除したい請求書の id
// ------------------------------------------------------------
function deleteInvoice(id) {
  const invoices = getInvoices();

  // filter() は条件に合う要素だけを残した新しい配列を返す
  // id が一致するもの以外を残す = id が一致するものを削除する
  const updated = invoices.filter(inv => inv.id !== id);

  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(updated));
}


// ============================================================
// プラン情報の管理
// ============================================================

// プランを取得する（'free' or 'pro'）
function getPlan() {
  return localStorage.getItem(STORAGE_KEY_PLAN) || 'free';
  // ※ getItem が null を返したとき || 'free' でデフォルト値を返す
}

// プランを保存する
function setPlan(plan) {
  localStorage.setItem(STORAGE_KEY_PLAN, plan);
}

// 無料プランで残り何件保存できるか返す
function getRemainingCount() {
  if (getPlan() === 'pro') return Infinity; // Pro は無制限

  const count = getInvoices().length;
  return Math.max(0, FREE_PLAN_LIMIT - count);
}


// ============================================================
// ユーザー設定（請求元情報の保存）
// ============================================================
// 毎回入力するのが面倒な「自分の情報」を保存・復元する

// 設定を保存する
// 引数: settings = { senderName: '...', senderAddress: '...', ... }
function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

// 設定を読み込む（なければ空オブジェクトを返す）
function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
  return raw ? JSON.parse(raw) : {};
}
