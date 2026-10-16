package com.fintrack.dto;

/** Health payloads. The database payload exposes only safe status info. */
public final class HealthDto {

  private HealthDto() {}

  public record Health(String status, String service, String version) {}

  public record DatabaseHealth(String status, String product, String dbVersion) {}
}
