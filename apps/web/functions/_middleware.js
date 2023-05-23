import sentryPlugin from "@cloudflare/pages-plugin-sentry";

export const onRequest = sentryPlugin({
  dsn: "https://5d95ce1a49ab4eb1956c0d5a15f55960:11e336af2ac04c3a931a5cd33230d662@o4505134083997696.ingest.sentry.io/4505134085832704",
});
