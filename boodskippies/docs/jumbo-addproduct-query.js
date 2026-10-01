var applicationVersionText = [...document.getElementsByTagName('script')].filter(element => element.textContent.includes("applicationVersion"))[0].textContent;
applicationVersionText = applicationVersionText.substr(applicationVersionText.indexOf('applicationVersion') + 20);
applicationVersionText = applicationVersionText.split('"')[0];

const customerId = (await cookieStore.get('CdId')).value;
console.log(applicationVersionText, customerId);

fetch("/api/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-source": "JUMBO_WEB-search",
    "apollographql-client-name": "JUMBO_WEB-search",
    "apollographql-client-version": applicationVersionText
  },
  body: JSON.stringify({
    operationName: "AddBasketItems",
    variables: {
      input: {
        lines: [{ sku: "782614DS", quantity: 1 }],
        type: "ECOMMERCE"
      },
      orderChannel: "WEB",
      customerId: customerId,
      shippingCosts: null,
      voucherCodes: []
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: "b3fa7733c84bcb9c0c4b39772c9d51c0fe3e5308c5088db132c6b1878ef19a2a"
      }
    }
  })
}).then(response => response.json()).then(console.log);