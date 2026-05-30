const isLocalLibsqlDatabase = (databaseUrl: string) =>
  databaseUrl.startsWith("file:") ||
  databaseUrl.startsWith("http://127.0.0.1") ||
  databaseUrl.startsWith("http://localhost");

export const resolveLibsqlAuthToken = ({
  databaseAuthToken,
  databaseUrl,
}: {
  databaseAuthToken: string | undefined;
  databaseUrl: string;
}) => {
  if (databaseAuthToken) {
    return databaseAuthToken;
  }

  return isLocalLibsqlDatabase(databaseUrl) ? "local" : "";
};
