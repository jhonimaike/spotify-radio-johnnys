export default class Controller {
  //padrão de injeção de dependencia
  constructor({ view, service }) {
    this.view = view;
    this.service = service;
  }

  static initialize(dependencies) {
    const controller = new Controller(dependencies);

    controller.onLoad();
    return controller;
  }

  async commandReceived(text) {
    // console.log("controller", text);
    return this.service.makeRequest({
      command: text.toLowerCase(),
    });
  }

  onLoad() {
    //bind this para dizer q deve usar o this da controller e não da view
    this.view.configureOnBtnClick(this.commandReceived.bind(this));
    this.view.onLoad();
  }
}
