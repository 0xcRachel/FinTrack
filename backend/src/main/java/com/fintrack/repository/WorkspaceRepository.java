package com.fintrack.repository;

import com.fintrack.entity.Workspace;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
  Optional<Workspace> findByDataOwner_UserId(Long userId);
}
