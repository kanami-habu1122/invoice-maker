// ============================================================
// modal.js - アップグレードモーダルの制御
// ============================================================
// このファイルの役割:
//   ・無料プランの制限に引っかかったときにモーダルを表示する
//   ・Proプランへの事前登録メールアドレスを収集する
//   ・モーダルの開閉を管理する
// ============================================================


// Stripeの決済リンク（後でStripeダッシュボードで発行したURLに変える）
const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/test_6oUaEW5hjguGe1q6xr3Je01';

// ------------------------------------------------------------
// モーダルをページに動的に追加する
// ------------------------------------------------------------
// index.html・create.html 両方で使えるように JS で生成する
function injectModal() {
  // すでに追加済みならスキップ
  if (document.getElementById('upgradeModal')) return;

  const el = document.createElement('div');
  el.id        = 'upgradeModal';
  el.className = 'modal-overlay hidden';
  el.innerHTML = `
    <div class="modal">
      <div class="modal-icon">⭐</div>
      <h2 class="modal-title" id="modalTitle">Proプランにアップグレード</h2>
      <p class="modal-desc"  id="modalDesc">より便利に使うためのプロ機能が揃っています。</p>

      <!-- 機能リスト -->
      <ul class="modal-features">
        <li>請求書の保存が無制限</li>
        <li>ウォーターマークなしのクリーンなPDF</li>
        <li>ロゴのアップロード</li>
        <li>請求番号の自動採番</li>
        <li>取引先の登録・呼び出し</li>
      </ul>

      <!-- 価格 -->
      <div class="modal-price">
        <span class="modal-price-amount">¥980</span>
        <span class="modal-price-unit"> / 月（税込）</span>
      </div>

      <!-- 事前登録フォーム -->
      <div class="modal-email-area">
        <input
          id="modalEmail"
          class="form-input"
          type="email"
          placeholder="メールアドレスを入力（リリース時にお知らせします）"
        />
      </div>

      <!-- ボタン -->
      <div class="modal-actions">
        <a class="btn btn-primary btn-full" id="modalPayBtn" href="#" target="_blank" rel="noopener">
          ¥980/月でProプランにアップグレード
        </a>
        <button class="btn btn-secondary btn-full" id="modalRegisterBtn">
          まずは事前登録する（無料）
        </button>
        <button class="btn btn-secondary btn-full" id="modalCloseBtn">
          閉じる
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  // イベントを登録する
  document.getElementById('modalCloseBtn').addEventListener('click', hideUpgradeModal);
  document.getElementById('modalRegisterBtn').addEventListener('click', handleRegister);
  document.getElementById('modalPayBtn').href = STRIPE_PAYMENT_URL;

  // オーバーレイ（背景）クリックで閉じる
  el.addEventListener('click', (e) => {
    if (e.target === el) hideUpgradeModal();
  });
}


// ------------------------------------------------------------
// モーダルを表示する
// ------------------------------------------------------------
// 引数: reason = 'limit_reached' | 'logo' | 'auto_number'
// ------------------------------------------------------------
function showUpgradeModal(reason) {
  injectModal(); // まだ追加されていなければ追加する

  // reason に応じてメッセージを変える
  const messages = {
    limit_reached: {
      title: '保存件数の上限に達しました',
      desc:  '無料プランは3件まで保存できます。\nProプランにアップグレードすると無制限に保存できます。',
    },
    logo: {
      title: 'ロゴはProプランの機能です',
      desc:  'ロゴを追加すると、よりプロフェッショナルな請求書を作成できます。',
    },
    auto_number: {
      title: '自動採番はProプランの機能です',
      desc:  '請求番号を自動で連番管理できます。手入力の手間がなくなります。',
    },
    client: {
      title: '取引先管理はProプランの機能です',
      desc:  '取引先を登録しておくと、次回からワンクリックで入力できます。',
    },
    item_template: {
      title: '明細テンプレートはProプランの機能です',
      desc:  'よく使う明細をテンプレートとして保存し、ワンクリックで呼び出せます。',
    },
    bank_template: {
      title: '振込先テンプレートはProプランの機能です',
      desc:  '複数の振込先を保存して、簡単に切り替えられます。',
    },
  };

  const msg = messages[reason] || { title: 'Proプランの機能です', desc: 'この機能はProプランで利用できます。' };

  document.getElementById('modalTitle').textContent = msg.title;
  // \n を <br> に変換して改行を表示する
  document.getElementById('modalDesc').innerHTML = msg.desc.replace(/\n/g, '<br>');

  // モーダルを表示する
  const modal = document.getElementById('upgradeModal');
  modal.classList.remove('hidden');

  // メール欄にフォーカスを当てる
  setTimeout(() => {
    document.getElementById('modalEmail').focus();
  }, 200);
}


// ------------------------------------------------------------
// モーダルを閉じる
// ------------------------------------------------------------
function hideUpgradeModal() {
  const modal = document.getElementById('upgradeModal');
  if (modal) modal.classList.add('hidden');
}


// ------------------------------------------------------------
// 事前登録ボタンを押したときの処理
// ------------------------------------------------------------
function handleRegister() {
  const emailEl = document.getElementById('modalEmail');
  const email   = emailEl.value.trim();

  // メールアドレスの簡易バリデーション
  // @ と . が含まれているか確認する
  if (!email || !email.includes('@') || !email.includes('.')) {
    emailEl.focus();
    emailEl.style.borderColor = 'var(--red)';
    setTimeout(() => emailEl.style.borderColor = '', 2000);
    return;
  }

  // メールアドレスを localStorage に保存する
  // ※ 本来はサーバーに送信するが、MVP では localStorage に保存するだけ
  const registrations = JSON.parse(localStorage.getItem('pro_registrations') || '[]');
  if (!registrations.includes(email)) {
    registrations.push(email);
    localStorage.setItem('pro_registrations', JSON.stringify(registrations));
  }

  // 完了メッセージに切り替える
  const modal = document.querySelector('#upgradeModal .modal');
  modal.innerHTML = `
    <div class="modal-success">
      <div class="modal-success-icon">🎉</div>
      <p class="modal-success-title">事前登録が完了しました！</p>
      <p class="modal-success-desc">
        ${email}<br>
        Proプランのリリース時にお知らせします。
      </p>
    </div>
    <div class="modal-actions" style="margin-top: 24px;">
      <button class="btn btn-primary btn-full" onclick="hideUpgradeModal()">閉じる</button>
    </div>
  `;
}
