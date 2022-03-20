export default class Service {
  constructor({ url }) {
    this.url = url;
  }

  async makeRequest(data, options) {
    const result = await fetch(this.url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    return result.json();
  }
}
