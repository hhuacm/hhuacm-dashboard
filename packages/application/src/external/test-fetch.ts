import { afterEach } from "bun:test";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type MockFetchResponse = Error | Response;

const originalFetch = globalThis.fetch;

const installFetch = (
  fetchImplementation: (
    url: FetchInput,
    init?: FetchInit
  ) => Promise<Response> | Response
) => {
  const fetchMock = (url: FetchInput, init?: FetchInit) =>
    Promise.resolve(fetchImplementation(url, init));

  globalThis.fetch = Object.assign(fetchMock, {
    preconnect: originalFetch.preconnect,
  }) as typeof globalThis.fetch;
};

const takeResponse = (responses: MockFetchResponse[]) => {
  const response = responses.shift();

  if (response === undefined) {
    throw new Error("Unexpected fetch call");
  }

  if (response instanceof Error) {
    throw response;
  }

  return response;
};

export const mockJsonResponse = (payload: unknown, status = 200) => {
  installFetch(() => Response.json(payload, { status }));
};

export const mockTextResponse = (payload: string, status = 200) => {
  installFetch(() => new Response(payload, { status }));
};

export const mockFetchUrls = (responses: MockFetchResponse[]) => {
  const urls: string[] = [];

  installFetch((url) => {
    urls.push(url.toString());
    return takeResponse(responses);
  });

  return urls;
};

export const mockFetchRequests = (responses: MockFetchResponse[]) => {
  const requests: RequestInit[] = [];

  installFetch((_url, init) => {
    requests.push(init ?? {});
    return takeResponse(responses);
  });

  return requests;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});
