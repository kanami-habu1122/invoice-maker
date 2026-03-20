// ============================================================
// preview.js - リアルタイムプレビューのDOM更新
// ============================================================
// このファイルの役割:
//   ・フォームの入力値をプレビューエリアに反映する
//   ・入力のたびに呼ばれ、請求書の見た目を更新する
// ============================================================


// ------------------------------------------------------------
// プレビューを更新する関数（メイン）
// ------------------------------------------------------------
// form.js の recalcTotals() が呼ばれるたびにこちらも呼ぶ
function updatePreview() {
  const previewEl = document.getElementById('invoicePreview');
  if (!previewEl) return; // プレビュー要素がなければ何もしない

  // フォームから現在の値を収集する
  const data = collectFormData(null);
  const totals = calcTotals(data.items);
  const plan = getPlan();

  // プレビューのHTMLを組み立てて一括更新する
  previewEl.innerHTML = buildPreviewHtml(data, totals, plan);
}


// ------------------------------------------------------------
// プレビューのHTMLを組み立てる関数
// ------------------------------------------------------------
function buildPreviewHtml(data, totals, plan) {

  // 請求先の表示
  const clientName   = data.clientName   || '（請求先未入力）';
  const clientPerson = data.clientPerson ? `${data.clientPerson} 様` : '';

  // 請求元の表示
  const senderName    = data.senderName    || '（氏名未入力）';
  const senderZip      = data.senderZip      || '';
  const senderAddress  = data.senderAddress  || '';
  const senderAddress2 = data.senderAddress2 || '';
  const senderPhone   = data.senderPhone   || '';
  const senderEmail   = data.senderEmail   || '';

  // 日付の表示（YYYY-MM-DD → YYYY年MM月DD日）
  const invoiceDate = formatDateJa(data.invoiceDate);
  const dueDate     = formatDateJa(data.dueDate);

  // 件名
  const subject = data.subject || '（件名未入力）';

  // 明細行のHTML
  const itemRowsHtml = buildItemRowsHtml(data.items);

  // 合計エリアのHTML
  const totalsHtml = buildTotalsHtml(totals);

  // 振込先のHTML
  const bankHtml = buildBankHtml(data);

  // インボイス登録番号（入力があるときだけ表示）
  const regNumHtml = data.senderRegNum
    ? `<div class="inv-reg-num">登録番号: ${esc(data.senderRegNum)}</div>`
    : '';

  // 備考（入力があるときだけ表示）
  const notesHtml = data.notes
    ? `<div class="inv-notes-area">${esc(data.notes)}</div>`
    : '';

  const watermarkHtml = '';

  // ロゴ（Proプランで設定されている場合）
  const settings = loadSettings();
  const logoHtml = settings.logoBase64
    ? `<div style="margin-bottom:8px;"><img src="${settings.logoBase64}" style="max-height:60px; max-width:160px;" /></div>`
    : '';

  return `
    <div class="inv-title">請　求　書</div>

    <div class="inv-header">
      <!-- 左: 請求先 -->
      <div>
        <div class="inv-client-name">${esc(clientName)} 御中</div>
        <div class="inv-client-person">${esc(clientPerson)}</div>
      </div>

      <!-- 右: 請求元・日付 -->
      <div class="inv-sender-block">
        ${logoHtml}
        <div class="inv-meta-row">
          <span class="inv-meta-label">請求日</span>
          <span>${invoiceDate}</span>
        </div>
        ${data.dueDate ? `
        <div class="inv-meta-row">
          <span class="inv-meta-label">支払期限</span>
          <span>${dueDate}</span>
        </div>` : ''}
        ${data.invoiceNumber ? `
        <div class="inv-meta-row">
          <span class="inv-meta-label">請求番号</span>
          <span>${esc(data.invoiceNumber)}</span>
        </div>` : ''}
        <hr style="border:none;border-top:1px solid #ddd;margin:6px 0;">
        <div class="inv-sender-name">${esc(senderName)}</div>
        ${senderZip      ? `<div>〒${esc(senderZip)}</div>` : ''}
        ${senderAddress  ? `<div>${esc(senderAddress)}</div>` : ''}
        ${senderAddress2 ? `<div>${esc(senderAddress2)}</div>` : ''}
        ${senderPhone   ? `<div>TEL: ${esc(senderPhone)}</div>` : ''}
        ${senderEmail   ? `<div>${esc(senderEmail)}</div>` : ''}
        ${regNumHtml}
      </div>
    </div>

    <!-- 件名 -->
    <div class="inv-subject-area">
      <div class="inv-subject-label">件名</div>
      <div class="inv-subject">${esc(subject)}</div>
    </div>

    <!-- 明細テーブル -->
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width:38%">品目・作業内容</th>
          <th style="width:10%; white-space:nowrap;" class="text-right">数量</th>
          <th style="width:18%; white-space:nowrap;" class="text-right">単価</th>
          <th style="width:14%; white-space:nowrap;" class="text-right">税率</th>
          <th style="width:18%" class="text-right">小計</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <!-- 合計 -->
    ${totalsHtml}

    <!-- 振込先 -->
    ${bankHtml}

    <!-- 備考 -->
    ${notesHtml}

    <!-- ウォーターマーク -->
    ${watermarkHtml}
  `;
}


// ------------------------------------------------------------
// 明細行のHTMLを組み立てる
// ------------------------------------------------------------
function buildItemRowsHtml(items) {
  if (!items || items.length === 0) {
    return '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:12px;">明細を入力してください</td></tr>';
  }

  return items.map(item => {
    const subtotal = calcItemSubtotal(item);
    const taxLabel = Number(item.taxRate) === 8
      ? '8%<span class="tax-reduced-mark">※</span>'
      : Number(item.taxRate) === 0 ? '非課税' : '10%';

    // 品目が空のときはスキップ（空行を表示しない）
    if (!item.description && !item.unitPrice) return '';

    return `
      <tr>
        <td>${esc(item.description || '')}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${formatNumber(item.unitPrice)}</td>
        <td class="text-right" style="white-space:nowrap;">${taxLabel}</td>
        <td class="text-right">${formatNumber(subtotal)}</td>
      </tr>
    `;
  }).join('');
}


// ------------------------------------------------------------
// 合計エリアのHTMLを組み立てる
// ------------------------------------------------------------
function buildTotalsHtml(totals) {
  const tax8Row  = totals.tax8  > 0
    ? `<div class="inv-totals-row"><span>消費税（8%）</span><span>${formatCurrency(totals.tax8)}</span></div>`
    : '';
  const tax10Row = totals.tax10 > 0
    ? `<div class="inv-totals-row"><span>消費税（10%）</span><span>${formatCurrency(totals.tax10)}</span></div>`
    : '';

  return `
    <div class="inv-totals">
      <div class="inv-totals-row">
        <span>小計</span>
        <span>${formatCurrency(totals.subtotal)}</span>
      </div>
      ${tax8Row}
      ${tax10Row}
      <div class="inv-totals-row total">
        <span>合計金額</span>
        <span>${formatCurrency(totals.total)}</span>
      </div>
    </div>
  `;
}


// ------------------------------------------------------------
// 振込先のHTMLを組み立てる
// ------------------------------------------------------------
function buildBankHtml(data) {
  // 銀行名が入力されていないときは表示しない
  if (!data.bankName) return '';

  return `
    <div class="inv-bank-area">
      <div class="inv-bank-title">お振込み先</div>
      <div>${esc(data.bankName)} ${esc(data.branchName || '')}</div>
      <div>${esc(data.accountType || '普通')} ${esc(data.accountNumber || '')}</div>
      <div>口座名義: ${esc(data.accountHolder || '')}</div>
      ${data.dueDate ? `<div style="margin-top:4px;font-weight:600;">お支払期限: ${formatDateJa(data.dueDate)}</div>` : ''}
    </div>
  `;
}


// ------------------------------------------------------------
// ユーティリティ関数
// ------------------------------------------------------------

// XSS対策: HTMLに埋め込む文字列をエスケープする（form.js と同じ）
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 日付を「YYYY年MM月DD日」形式に変換する
// 引数: '2024-03-20' → 戻り値: '2024年03月20日'
function formatDateJa(dateStr) {
  if (!dateStr) return '';

  // split('-') で ['2024', '03', '20'] に分割する
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}
