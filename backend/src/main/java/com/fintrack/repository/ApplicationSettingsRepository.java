package com.fintrack.repository;

import com.fintrack.entity.ApplicationSettings;
import com.fintrack.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ApplicationSettingsRepository
    extends JpaRepository<ApplicationSettings, Long>, JpaSpecificationExecutor<ApplicationSettings> {

  @Query("SELECT s.settingValue FROM ApplicationSettings s WHERE s.user = :user AND s.settingKey = :key")
  String findValueByUserAndKey(@Param("user") Users user, @Param("key") String key);

  java.util.Optional<ApplicationSettings> findByUserAndSettingKey(Users user, String settingKey);
  boolean existsByUserAndSettingKey(Users user, String settingKey);
}
