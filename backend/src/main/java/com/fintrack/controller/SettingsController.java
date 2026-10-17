package com.fintrack.controller;

import com.fintrack.dto.SettingsDto;
import com.fintrack.dto.SettingsUpdateRequest;
import com.fintrack.entity.ApplicationSettings;
import com.fintrack.entity.Users;
import com.fintrack.repository.ApplicationSettingsRepository;
import com.fintrack.repository.UsersRepository;
import com.fintrack.security.AppUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** User settings: theme, currency, locale, date format, default dashboard period. */
@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {

  private final ApplicationSettingsRepository settingsRepository;
  private final UsersRepository usersRepository;

  public SettingsController(ApplicationSettingsRepository settingsRepository,
                            UsersRepository usersRepository) {
    this.settingsRepository = settingsRepository;
    this.usersRepository = usersRepository;
  }

  @GetMapping
  public SettingsDto get(@AuthenticationPrincipal AppUserDetails details) {
    Users user = usersRepository.getReferenceById(details.getUserId());
    return new SettingsDto(
        value(user, "theme", "dark"),
        value(user, "displayCurrency", "VND"),
        value(user, "locale", "vi-VN"),
        value(user, "dateFormat", "dd/MM/yyyy"),
        value(user, "dashboardDefaultPeriod", "THIS_MONTH"));
  }

  @PutMapping
  public ResponseEntity<SettingsDto> put(@AuthenticationPrincipal AppUserDetails details,
                                         @RequestBody SettingsUpdateRequest req) {
    Users user = usersRepository.getReferenceById(details.getUserId());
    if (req.theme() != null) set(user, "theme", req.theme());
    if (req.displayCurrency() != null) set(user, "displayCurrency", req.displayCurrency());
    if (req.locale() != null) set(user, "locale", req.locale());
    if (req.dateFormat() != null) set(user, "dateFormat", req.dateFormat());
    if (req.dashboardDefaultPeriod() != null) set(user, "dashboardDefaultPeriod", req.dashboardDefaultPeriod());
    return ResponseEntity.ok(get(details));
  }

  private String value(Users user, String key, String def) {
    String v = settingsRepository.findValueByUserAndKey(user, key);
    return v == null ? def : v;
  }

  private void set(Users user, String key, String value) {
    java.util.Optional<ApplicationSettings> existing =
        settingsRepository.findByUserAndSettingKey(user, key);
    ApplicationSettings s = existing.orElseGet(() -> new ApplicationSettings(user, key, null));
    s.setSettingKey(key);
    s.setSettingValue(value);
    settingsRepository.save(s);
  }
}
