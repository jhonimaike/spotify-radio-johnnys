export default class View {
  constructor() {
    this.btnStart = document.getElementById("start");
    this.btnStop = document.getElementById("stop");
    this.buttons = () => Array.from(document.querySelectorAll("button"));

    this.ignoreButtons = new Set(["unnassigned"]);

    async function onBtnClick() {}
    this.onBtnClick = onBtnClick;

    this.DISABLE_BTN_TIMEOUT = 500;
  }

  onLoad() {
    this.changeCommandBtnsVisibility();
    //bind this para guardar o contexto
    this.btnStart.onclick = this.onStartClicked.bind(this);
  }

  changeCommandBtnsVisibility(hide = true) {
    Array.from(document.querySelectorAll("[name=command]")).forEach((btn) => {
      const fn = hide ? "add" : "remove";
      btn.classList[fn]("unassigned");

      function onClickReset() {}
      btn.onclick = onClickReset;
    });
  }

  configureOnBtnClick(fn) {
    this.onBtnClick = fn;
  }

  async onStartClicked({ srcElement: { innerText } }) {
    const btnText = innerText;
    await this.onBtnClick(btnText);
    this.toggleBtnStart();
    this.changeCommandBtnsVisibility(false);

    // console.log({ innerText });

    this.buttons()
      .filter((btn) => this.notIsUnassignedButton(btn))
      .forEach(this.setupBtnAction.bind(this));
  }

  setupBtnAction(btn) {
    const text = btn.innerText.toLowerCase();
    if (text.includes("start")) return;

    if (text.includes("stop")) {
      btn.onclick = this.onStopBtn.bind(this);
      return;
    }

    // para os demais comandos
    btn.onclick = this.onCommandClick.bind(this);
  }

  async onCommandClick(btn) {
    const {
      srcElement: { classList, innerText },
    } = btn;

    // debugger;
    this.toggleDisableCommandBtn(classList);

    await this.onBtnClick(innerText);

    setTimeout(() => this.toggleDisableCommandBtn(classList), 500);
  }

  toggleDisableCommandBtn(classList) {
    if (!classList.contains("active")) {
      classList.add("active");
      return;
    }

    classList.remove("active");
  }

  onStopBtn({ srcElement: { innerText } }) {
    this.toggleBtnStart(false);
    this.changeCommandBtnsVisibility(true);

    return this.onBtnClick(innerText);
  }

  notIsUnassignedButton(btn) {
    //ignorar botões sem uso
    const classes = Array.from(btn.classList);

    return !!!classes.find((item) => this.ignoreButtons.has(item));
  }

  //ocultar start e mostrar stop
  toggleBtnStart(active = true) {
    if (active) {
      this.btnStart.classList.add("hidden");
      this.btnStop.classList.remove("hidden");
      return;
    }
    this.btnStop.classList.add("hidden");
    this.btnStart.classList.remove("hidden");
  }
}
