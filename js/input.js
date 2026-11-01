// 相対ドラッグ入力。画面のどこを触っても、指の「移動量」だけを積算する。
// UI要素（data-ui 属性の内側）への操作はドラッグ扱いしない。

export class Input {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.activeId = null;
    this.lastX = 0;
    this.lastY = 0;
    this.dx = 0;
    this.dy = 0;

    const opts = { passive: false };
    window.addEventListener('pointerdown', (e) => this.onDown(e), opts);
    window.addEventListener('pointermove', (e) => this.onMove(e), opts);
    window.addEventListener('pointerup', (e) => this.onUp(e), opts);
    window.addEventListener('pointercancel', (e) => this.onUp(e), opts);

    // スクロール・ズーム・長押しメニュー・ダブルタップズームの抑止
    const isFormControl = (t) => t && t.closest && t.closest('input, select, textarea');
    document.addEventListener('touchmove', (e) => { if (!isFormControl(e.target)) e.preventDefault(); }, opts);
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, opts);
    document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);
    document.addEventListener('dblclick', (e) => e.preventDefault(), opts);
    document.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
    document.addEventListener('selectstart', (e) => { if (!isFormControl(e.target)) e.preventDefault(); }, opts);
  }

  isUI(e) {
    return e.target && e.target.closest && e.target.closest('[data-ui]');
  }

  /** 指定のポインターをドラッグ用として掴む（リトライボタン押下からそのまま操作など） */
  claim(e) {
    this.activeId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.isUI(e)) return;
    e.preventDefault();
    // 新しい指が触れたら、その指に乗り換える（相対なので位置ジャンプは起きない）
    this.claim(e);
    if (this.handlers.onDown) this.handlers.onDown(e);
  }

  onMove(e) {
    if (e.pointerId !== this.activeId) return;
    // 途中のイベントを含めても総移動量は同じなので最終座標の差分だけで良い
    this.dx += e.clientX - this.lastX;
    this.dy += e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  onUp(e) {
    if (e.pointerId !== this.activeId) return;
    this.onMove(e);
    this.activeId = null;
  }

  /** 前フレームからの移動量(CSS px)を取り出してリセット */
  consume() {
    const d = { x: this.dx, y: this.dy };
    this.dx = 0;
    this.dy = 0;
    return d;
  }

  get isDown() { return this.activeId !== null; }
}
