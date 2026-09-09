if (process.env.ADMIN_TEST_DB !== '1') {
  throw new Error(
    'yarn test:db requires ADMIN_TEST_DB=1 and a migrated Postgres'
  );
}
