package com.fintrack.controller;

import com.fintrack.dto.HealthDto.DatabaseHealth;
import com.fintrack.dto.HealthDto.Health;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness + database connectivity probes. The database endpoint reports safe
 * status information only — never credentials or connection strings.
 */
@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Liveness and database connectivity probes")
public class HealthController {

  private final DataSource dataSource;
  private final BuildProperties buildProperties;

  public HealthController(DataSource dataSource, java.util.Optional<BuildProperties> buildProperties) {
    this.dataSource = dataSource;
    this.buildProperties =
        buildProperties.orElse(null);
  }

  @GetMapping
  @Operation(summary = "Application liveness")
  public ResponseEntity<Health> health() {
    String version = buildProperties != null ? buildProperties.getVersion() : "dev";
    return ResponseEntity.ok(new Health("UP", "fintrack-backend", version));
  }

  @GetMapping("/database")
  @Operation(summary = "Database connectivity (safe status only)")
  public ResponseEntity<DatabaseHealth> database() {
    try (Connection connection = dataSource.getConnection()) {
      if (!connection.isValid(3)) {
        return ResponseEntity.status(503)
            .body(new DatabaseHealth("DOWN", "unknown", "unreachable"));
      }
      DatabaseMetaData meta = connection.getMetaData();
      return ResponseEntity.ok(
          new DatabaseHealth("UP", meta.getDatabaseProductName(), meta.getDatabaseProductVersion()));
    } catch (Exception ex) {
      return ResponseEntity.status(503)
          .body(new DatabaseHealth("DOWN", "unknown", "unreachable"));
    }
  }
}
