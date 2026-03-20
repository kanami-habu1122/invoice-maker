// ============================================================
// list.js - 請求書一覧画面のロジック
// ============================================================
// このファイルの役割:
//   ・localStorage から請求書を読み込んで画面に表示する
//   ・削除ボタンの処理
//   ・新規作成ボタンで create.html に遷移する
// ============================================================


// ------------------------------------------------------------
// HTML要素の取得
// ------------------------------------------------------------
const invoiceListEl = document.getElementById('invoiceList'); // 一覧を入れるul要素
const newInvoiceBtn = document.getElementById('newInvoiceBtn'); // 新規作成ボタン


// ------------------------------------------------------------
// 一覧を描画する関数
// ------------------------------------------------------------
function renderInvoiceList() {
  const invoices = getInvoices(); // storage.js から全件取得

  // データが0件のとき: 空状態を表示する
  if (invoices.length === 0) {
    invoiceListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p class="empty-state-title">請求書がまだありません</p>
        <p class="empty-state-desc">「新しい請求書」ボタンから作成してください。</p>
      </div>
    `;
    return;
  }

  // データがある: 各請求書のカードを HTML 文字列で組み立てて一括挿入する
  // map() で各請求書を HTML 文字列に変換し、join('') でつなげる
  invoiceListEl.innerHTML = invoices.map(inv => {

    // 合計金額を計算する（invoice.js の関数）
    const totals = calcTotals(inv.items || []);

    // 金額を「¥236,500」形式に変換（invoice.js の関数）
    const amountText = formatCurrency(totals.total);

    // 件名がなければ「(件名なし)」と表示する
    const subject = inv.subject || '(件名なし)';

    // 請求先会社名がなければ「(請求先未設定)」と表示する
    const client = inv.clientName || '(請求先未設定)';

    // 請求日の表示（'YYYY-MM-DD' → 'YYYY/MM/DD' に変換）
    const date = (inv.invoiceDate || '').replace(/-/g, '/');

    // カードの HTML を返す
    // ※ data-id="${inv.id}" に請求書のIDを埋め込んでおく
    //    削除ボタンを押したとき、どの請求書か特定するために使う
    return `
      <div class="invoice-card" data-id="${inv.id}">

        <div class="invoice-card-main">
          <div class="invoice-card-number">${inv.invoiceNumber ? '# ' + inv.invoiceNumber : ''}</div>
          <div class="invoice-card-subject">${subject}</div>
          <div class="invoice-card-client">${client}</div>
        </div>

        <div class="invoice-card-meta">
          <div class="invoice-card-amount">${amountText}</div>
          <div class="invoice-card-date">${date}</div>
        </div>

        <div class="invoice-card-actions">
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${inv.id}">編集</button>
          <button class="btn btn-secondary btn-sm pdf-btn"  data-id="${inv.id}">PDF</button>
          <button class="btn btn-danger    btn-sm del-btn"  data-id="${inv.id}">削除</button>
        </div>

      </div>
    `;
  }).join('');

  // ボタンのイベントを登録する
  // ※ innerHTML を書き換えるたびに再登録が必要
  attachCardEvents();
}


// ------------------------------------------------------------
// カードのボタンにイベントを登録する
// ------------------------------------------------------------
function attachCardEvents() {

  // 編集ボタン: create.html?id=XXX に遷移する
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // URLパラメータでIDを渡す（create.html 側で読み込む）
      window.location.href = `create.html?id=${id}`;
    });
  });

  // PDF ボタン: 編集画面を開いてそのままPDF出力する
  document.querySelectorAll('.pdf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // 編集画面を開き、自動でPDF出力を起動する
      window.location.href = `create.html?id=${id}&print=1`;
    });
  });

  // 削除ボタン
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;

      // 確認ダイアログを出す
      // confirm() は「OK / キャンセル」のダイアログを出し、OK なら true を返す
      if (!confirm('この請求書を削除しますか？')) return;

      // storage.js の削除関数を呼ぶ
      deleteInvoice(id);

      // 一覧を再描画する
      renderInvoiceList();

      // プラン表示も更新する（件数が変わったので）
      updatePlanDisplay();
    });
  });
}


// ------------------------------------------------------------
// 新規作成ボタン
// ------------------------------------------------------------
newInvoiceBtn.addEventListener('click', () => {
  const plan = getPlan();
  const remaining = getRemainingCount();

  // 無料プランで上限に達していたらモーダルを表示する（modal.js）
  if (plan === 'free' && remaining <= 0) {
    showUpgradeModal('limit_reached');
    return;
  }

  // create.html に遷移する（id なし = 新規作成）
  window.location.href = 'create.html';
});


// ------------------------------------------------------------
// 初期化（ページ読み込み時に実行）
// ------------------------------------------------------------
function init() {
  renderInvoiceList(); // 一覧を描画
  updatePlanDisplay(); // プラン表示を更新
}

init();
