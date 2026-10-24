package com.fintrack.config;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Repairs rows whose JPA {@code @Version} column is NULL.
 *
 * <p>Hibernate interprets a NULL version as a transient entity: the next UPDATE either inserts a
 * duplicate primary key or fails an optimistic-lock check. Databases seeded with raw SQL before
 * version 05 of the schema can contain such rows, which surfaced as HTTP 500 on every edit.
 * The schema now declares {@code NOT NULL DEFAULT 0}; this idempotent backfill keeps older local
 * databases usable without requiring a manual migration before the app starts.
 */
@Component
public class OptimisticLockVersionBackfill implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(OptimisticLockVersionBackfill.class);
  private static final List<String> TABLES = List.of(
      "users", "accounts", "categories", "transactions", "budgets",
      "savings_goals", "goal_contributions", "application_settings");

  private final JdbcTemplate jdbcTemplate;

  public OptimisticLockVersionBackfill(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public void run(ApplicationArguments args) {
    int repaired = 0;
    for (String table : TABLES) {
      // Table names are a private constant allowlist, never user input.
      repaired += jdbcTemplate.update("UPDATE " + table + " SET version = 0 WHERE version IS NULL");
    }
    if (repaired > 0) {
      log.warn("Backfilled optimistic-lock version = 0 for {} row(s). Apply database/05_fix_optimistic_lock_versions.sql to persist the constraint.",
          repaired);
    }
  }
}
