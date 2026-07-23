const INDEX_PATH = "/index.html";

function isPageRequest(request) {
  return request.method === "GET" || request.method === "HEAD";
}

function isClientRoute(request) {
  if (!isPageRequest(request)) return false;
  const pathname = new URL(request.url).pathname;
  return !pathname.startsWith("/assets/") && !pathname.includes(".");
}

function indexRequest(request) {
  const indexUrl = new URL(request.url);
  indexUrl.pathname = INDEX_PATH;
  return new Request(indexUrl, request);
}

async function fetchAsset(request, assets) {
  if (isClientRoute(request)) {
    return assets.fetch(indexRequest(request));
  }

  const response = await assets.fetch(request);
  return response;
}

export default {
  fetch(request, environment) {
    return fetchAsset(request, environment.ASSETS);
  },
};
