import { ApolloClient, InMemoryCache, split, HttpLink } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { setContext } from "@apollo/client/link/context";

const PROJECT_ID = "2gXzl5O5ldO";
const HTTP_ENDPOINT = `https://villa.momen.app/zero/${PROJECT_ID}/api/graphql-v2`;
const WS_ENDPOINT = `wss://villa.momen.app/zero/${PROJECT_ID}/api/graphql-subscription`;

const httpLink = new HttpLink({
  uri: HTTP_ENDPOINT,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("auth_token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const wsClient = new SubscriptionClient(WS_ENDPOINT, {
  reconnect: true,
  connectionParams: () => {
    const token = localStorage.getItem("auth_token");
    return token
      ? {
          authToken: token,
        }
      : {};
  },
});

const wsLink = new WebSocketLink(wsClient);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
