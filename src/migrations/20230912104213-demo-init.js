module.exports = {
  up: ({ query, database }) =>
    query(`
      CREATE TABLE IF NOT EXISTS ${database}.foo
        (
          id String,
          action UInt8,
          status UInt8,
          date DateTime,
          version UInt8
        )
        ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, id);
    `),

  down: ({ query, database }) => query(`DROP TABLE IF EXISTS ${database}.foo`),
};
