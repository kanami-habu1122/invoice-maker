// ============================================================
// plan.js - 無料/有料プランの制限チェック
// ============================================================
// このファイルの役割:
//   ・現在のプランを確認する
//   ・無料プランの制限に引っかかるか判定する
//   ・制限に引っかかったらモーダルを表示する（modal.js を呼ぶ）
// ============================================================


// ------------------------------------------------------------
// ヘッダーのプラン表示を更新する
// ------------------------------------------------------------
// index.html と create.html の両方で呼ぶ
function updatePlanDisplay() {
  const plan      = getPlan();          // storage.js の関数
  const remaining = getRemainingCount(); // storage.js の関数
  const total     = getInvoices().length;

  // ヘッダーのバッジ要素
  const planBadge = document.getElementById('planBadge');
  if (planBadge) {
    if (plan === 'pro') {
      planBadge.textContent = 'Pro';
      planBadge.className   = 'badge badge-pro';
    } else {
      planBadge.textContent = `無料 ${total}/${3}件`;
      planBadge.className   = 'badge badge-free';
    }
  }

  // 一覧画面のプランバナー（残り1件以下になったら表示）
  const planBanner = document.getElementById('planBanner');
  if (planBanner) {
    if (plan === 'free' && remaining <= 1) {
      planBanner.classList.remove('hidden');

      const bannerText = document.getElementById('planBannerText');
      if (bannerText) {
        if (remaining === 0) {
          bannerText.textContent = '保存件数が上限（3件）に達しました。新しい請求書を作るには Pro プランが必要です。';
        } else {
          bannerText.textContent = `無料プランの残り保存件数は ${remaining} 件です。`;
        }
      }
    } else {
      planBanner.classList.add('hidden');
    }
  }
}


// ------------------------------------------------------------
// 保存できるか確認する関数
// ------------------------------------------------------------
// 引数: invoiceId - 編集中の請求書のID（新規のときは null）
// 戻り値: true = 保存OK / false = 制限に引っかかった
// ------------------------------------------------------------
function canSave(invoiceId) {
  const plan = getPlan();

  // Pro プランは無制限
  if (plan === 'pro') return true;

  // 既存データの更新（idがある）は制限しない
  if (invoiceId && getInvoice(invoiceId)) return true;

  // 新規保存：件数チェック
  return getRemainingCount() > 0;
}
