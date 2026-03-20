// ============================================================
// form.js - 入力フォームの操作ロジック
// ============================================================
// このファイルの役割:
//   ・明細行の追加・削除
//   ・入力値が変わるたびに合計金額を再計算する
//   ・フォームの値をオブジェクトにまとめる（収集）
//   ・保存ボタンの処理
// ============================================================


// ------------------------------------------------------------
// HTML要素の取得
// ------------------------------------------------------------
const itemsTbody   = document.getElementById('itemsTbody');   // 明細行を入れる tbody
const addItemBtn   = document.getElementById('addItemBtn');   // 「行を追加」ボタン
const saveBtn      = document.getElementById('saveBtn');      // 保存ボタン
const cancelBtn    = document.getElementById('cancelBtn');    // キャンセルボタン

// 合計表示エリア
const subtotalEl   = document.getElementById('subtotalEl');
const tax8El       = document.getElementById('tax8El');
const tax10El      = document.getElementById('tax10El');
const totalEl      = document.getElementById('totalEl');

// 税率行の表示切り替え用
const tax8Row      = document.getElementById('tax8Row');
const tax10Row     = document.getElementById('tax10Row');


// ------------------------------------------------------------
// URLパラメータから編集中の請求書IDを取得する
// ------------------------------------------------------------
// 例: create.html?id=1710900000000 → '1710900000000'
//     create.html（パラメータなし）→ null（新規作成）
// ------------------------------------------------------------
function getEditId() {
  // URLSearchParams はURLのクエリパラメータを簡単に扱えるAPI
  const params = new URLSearchParams(window.location.search);
  return params.get('id'); // 'id' パラメータがなければ null を返す
}


// ------------------------------------------------------------
// 明細行のHTML文字列を組み立てる関数
// ------------------------------------------------------------
// 引数: item = { description, quantity, unitPrice, taxRate }
// 引数: index = 行番号（0始まり）
// ------------------------------------------------------------
function createItemRowHtml(item, index) {
  return `
    <tr class="item-row" data-index="${index}">
      <td class="col-desc">
        <input class="form-input item-desc"
               type="text"
               placeholder="作業内容・品目"
               value="${escapeHtml(item.description || '')}">
      </td>
      <td class="col-qty">
        <input class="form-input item-qty"
               type="number"
               min="0"
               value="${item.quantity ?? 1}">
      </td>
      <td class="col-price">
        <input class="form-input item-price"
               type="number"
               min="0"
               placeholder="0"
               value="${item.unitPrice || ''}">
      </td>
      <td class="col-tax">
        <select class="form-input item-tax">
          <option value="10" ${Number(item.taxRate) === 10 ? 'selected' : ''}>10%</option>
          <option value="8"  ${Number(item.taxRate) ===  8 ? 'selected' : ''}>8%（軽減）</option>
          <option value="0"  ${Number(item.taxRate) ===  0 ? 'selected' : ''}>非課税</option>
        </select>
      </td>
      <td class="col-subtotal">
        <span class="item-subtotal">¥0</span>
      </td>
      <td class="col-action">
        <button class="item-del-btn" type="button" title="この行を削除">×</button>
      </td>
    </tr>
  `;
}

// XSS対策: ユーザー入力をHTMLに埋め込む前に特殊文字をエスケープする
// 例: <script> → &lt;script&gt;
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ------------------------------------------------------------
// 明細行を全て再描画する
// ------------------------------------------------------------
// 引数: items = 明細行オブジェクトの配列
// ------------------------------------------------------------
function renderItemRows(items) {
  // map() で各行のHTMLを作り、join('') で1つの文字列にしてから挿入
  itemsTbody.innerHTML = items.map((item, i) => createItemRowHtml(item, i)).join('');

  // 各行の入力イベントを登録する
  attachItemEvents();

  // 合計を再計算する
  recalcTotals();
}


// ------------------------------------------------------------
// 明細行の入力イベントを登録する
// ------------------------------------------------------------
function attachItemEvents() {
  const rows = itemsTbody.querySelectorAll('.item-row');

  rows.forEach(row => {

    // 入力値が変わるたびに合計を再計算する
    // 'input' イベント: キーを押すたびに発火（リアルタイム更新）
    row.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('input', recalcTotals);
      input.addEventListener('change', recalcTotals); // select の変更にも対応
    });

    // 削除ボタン
    const delBtn = row.querySelector('.item-del-btn');
    delBtn.addEventListener('click', () => {
      // 行が1つしかない場合は削除しない
      if (itemsTbody.querySelectorAll('.item-row').length <= 1) {
        alert('明細は最低1行必要です。');
        return;
      }
      row.remove();       // DOMから行を削除
      recalcTotals();     // 合計を再計算
    });
  });
}


// ------------------------------------------------------------
// 合計金額を再計算して画面に表示する
// ------------------------------------------------------------
function recalcTotals() {
  // 現在の行データを収集する
  const items = collectItems();

  // invoice.js の計算関数を呼ぶ
  const totals = calcTotals(items);

  // 各行の小計を表示する
  const rows = itemsTbody.querySelectorAll('.item-row');
  rows.forEach((row, i) => {
    const subtotalEl = row.querySelector('.item-subtotal');
    if (subtotalEl && items[i]) {
      subtotalEl.textContent = formatCurrency(calcItemSubtotal(items[i]));
    }
  });

  // 合計エリアを更新する
  subtotalEl.textContent = formatCurrency(totals.subtotal);
  totalEl.textContent    = formatCurrency(totals.total);

  // 8%の消費税: 0円のときは行を非表示にする
  if (totals.tax8 > 0) {
    tax8Row.style.display = '';
    tax8El.textContent    = formatCurrency(totals.tax8);
  } else {
    tax8Row.style.display = 'none';
  }

  // プレビューを更新する（明細行が変わるたびに右ペインに反映）
  if (typeof updatePreview === "function") updatePreview();

  // 10%の消費税
  if (totals.tax10 > 0) {
    tax10Row.style.display = '';
    tax10El.textContent    = formatCurrency(totals.tax10);
  } else {
    tax10Row.style.display = 'none';
  }
}


// ------------------------------------------------------------
// 現在の明細行データを収集する
// ------------------------------------------------------------
// 戻り値: items の配列
// ------------------------------------------------------------
function collectItems() {
  const rows = itemsTbody.querySelectorAll('.item-row');
  return Array.from(rows).map(row => ({
    description: row.querySelector('.item-desc').value,
    quantity:    Number(row.querySelector('.item-qty').value)  || 0,
    unitPrice:   Number(row.querySelector('.item-price').value) || 0,
    taxRate:     Number(row.querySelector('.item-tax').value),
  }));
}


// ------------------------------------------------------------
// フォーム全体の値を請求書オブジェクトとして収集する
// ------------------------------------------------------------
function collectFormData(existingInvoice) {
  // 既存データがあればそのIDを引き継ぐ、なければ新規ID
  const id = existingInvoice ? existingInvoice.id : generateId();

  return {
    id,
    invoiceNumber: document.getElementById('invoiceNumber').value.trim(),
    invoiceDate:   document.getElementById('invoiceDate').value,
    dueDate:       document.getElementById('dueDate').value,
    subject:       document.getElementById('subject').value.trim(),

    clientName:   document.getElementById('clientName').value.trim(),
    clientPerson: document.getElementById('clientPerson').value.trim(),

    senderName:    document.getElementById('senderName').value.trim(),
    senderZip:     document.getElementById('senderZip').value.trim(),
    senderAddress: document.getElementById('senderAddress').value.trim(),
    senderAddress2: document.getElementById('senderAddress2').value.trim(),
    senderPhone:   document.getElementById('senderPhone').value.trim(),
    senderEmail:   document.getElementById('senderEmail').value.trim(),
    senderRegNum:  document.getElementById('senderRegNum').value.trim(),

    items: collectItems(),

    bankName:      document.getElementById('bankName').value.trim(),
    branchName:    document.getElementById('branchName').value.trim(),
    accountType:   document.getElementById('accountType').value,
    accountNumber: document.getElementById('accountNumber').value.trim(),
    accountHolder: document.getElementById('accountHolder').value.trim(),

    notes: document.getElementById('notes').value.trim(),

    createdAt: existingInvoice ? existingInvoice.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


// ------------------------------------------------------------
// フォームに既存データを流し込む（編集時）
// ------------------------------------------------------------
function populateForm(invoice) {
  document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
  document.getElementById('invoiceDate').value   = invoice.invoiceDate   || getTodayString();
  document.getElementById('dueDate').value       = invoice.dueDate       || getNextMonthEnd();
  document.getElementById('subject').value       = invoice.subject       || '';

  document.getElementById('clientName').value   = invoice.clientName   || '';
  document.getElementById('clientPerson').value = invoice.clientPerson || '';

  document.getElementById('senderName').value     = invoice.senderName     || '';
  document.getElementById('senderZip').value      = invoice.senderZip      || '';
  document.getElementById('senderAddress').value  = invoice.senderAddress  || '';
  document.getElementById('senderAddress2').value = invoice.senderAddress2 || '';
  document.getElementById('senderPhone').value   = invoice.senderPhone   || '';
  document.getElementById('senderEmail').value   = invoice.senderEmail   || '';
  document.getElementById('senderRegNum').value  = invoice.senderRegNum  || '';

  document.getElementById('bankName').value      = invoice.bankName      || '';
  document.getElementById('branchName').value    = invoice.branchName    || '';
  document.getElementById('accountType').value   = invoice.accountType   || '普通';
  document.getElementById('accountNumber').value = invoice.accountNumber || '';
  document.getElementById('accountHolder').value = invoice.accountHolder || '';

  document.getElementById('notes').value = invoice.notes || '';

  // 明細行を描画する
  renderItemRows(invoice.items && invoice.items.length > 0
    ? invoice.items
    : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 10 }]
  );
}


// ------------------------------------------------------------
// 「行を追加」ボタン
// ------------------------------------------------------------
addItemBtn.addEventListener('click', () => {
  // 空の行を1つ追加する
  const newRow = document.createElement('tr');
  newRow.className = 'item-row';
  newRow.dataset.index = itemsTbody.querySelectorAll('.item-row').length;
  newRow.innerHTML = createItemRowHtml(
    { description: '', quantity: 1, unitPrice: 0, taxRate: 10 },
    newRow.dataset.index
  );
  itemsTbody.appendChild(newRow);

  // 新しく追加した行のイベントを登録する
  const inputs = newRow.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.addEventListener('input',  recalcTotals);
    input.addEventListener('change', recalcTotals);
  });
  newRow.querySelector('.item-del-btn').addEventListener('click', () => {
    if (itemsTbody.querySelectorAll('.item-row').length <= 1) {
      alert('明細は最低1行必要です。');
      return;
    }
    newRow.remove();
    recalcTotals();
  });

  // 新しい行の品目欄にフォーカスを当てる
  newRow.querySelector('.item-desc').focus();
});


// ------------------------------------------------------------
// 保存ボタン
// ------------------------------------------------------------
saveBtn.addEventListener('click', () => {
  const editId  = getEditId();
  const existing = editId ? getInvoice(editId) : null;

  // 件名のバリデーション（必須チェック）
  const subject = document.getElementById('subject').value.trim();
  if (!subject) {
    alert('件名を入力してください。');
    document.getElementById('subject').focus();
    return;
  }

  // フォームデータを収集する
  const invoice = collectFormData(existing);

  // 請求元情報を設定として保存する（次回自動入力のため）
  saveSettings({
    senderName:    invoice.senderName,
    senderAddress: invoice.senderAddress,
    senderPhone:   invoice.senderPhone,
    senderEmail:   invoice.senderEmail,
    senderRegNum:  invoice.senderRegNum,
    bankName:      invoice.bankName,
    branchName:    invoice.branchName,
    accountType:   invoice.accountType,
    accountNumber: invoice.accountNumber,
    accountHolder: invoice.accountHolder,
  });

  // storage.js の saveInvoice を呼ぶ
  const result = saveInvoice(invoice);

  if (result.success) {
    window.location.href = 'index.html'; // 一覧に戻る
  } else if (result.reason === 'limit_reached') {
    showUpgradeModal('limit_reached');
  }
});


// ------------------------------------------------------------
// キャンセルボタン
// ------------------------------------------------------------
cancelBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});
