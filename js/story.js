export const FINAL_MESSAGE = `Parabéns, Samara! 🎉

Você atravessou o castelo inteiro, enfrentou cada Gap que apareceu no caminho e chegou até aqui — exatamente como você faz todos os dias.

A vida vai sempre inventar novos Gaps pra te derrubar. Uns bem bobos (você sabe exatamente quais 😄), outros bem mais difíceis. Mas você desgapa os Gaps.

E não importa quantos Gaps a gente enfrente — com você vale a pena.

Feliz aniversário! Que hoje seja só o primeiro parabéns de muitos outros pela frente.`;

const CHAR_DELAY_MS = 32;

export class Typewriter {
  constructor(el) {
    this.el = el;
    this._token = 0;
    this._full = '';
    this._done = true;
  }

  play(text) {
    this._full = text;
    this._done = false;
    this.el.textContent = '';
    const myToken = ++this._token;

    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (myToken !== this._token) return; // superseded (skip or new play call)
        if (i >= this._full.length) {
          this._done = true;
          resolve();
          return;
        }
        this.el.textContent += this._full[i];
        i++;
        setTimeout(step, CHAR_DELAY_MS);
      };
      this._resolveCurrent = resolve;
      step();
    });
  }

  /** If currently typing, jump straight to full text. Returns true if it was skipped. */
  skip() {
    if (this._done) return false;
    this._token++; // invalidates in-flight step loop
    this.el.textContent = this._full;
    this._done = true;
    if (this._resolveCurrent) this._resolveCurrent();
    return true;
  }

  get isDone() {
    return this._done;
  }
}
