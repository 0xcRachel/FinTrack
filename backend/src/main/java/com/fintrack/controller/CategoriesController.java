package com.fintrack.controller;

import com.fintrack.dto.CategoryDto;
import com.fintrack.dto.CategoryCreateRequest;
import com.fintrack.dto.CategoryUpdateRequest;
import com.fintrack.enums.CategoryType;
import com.fintrack.security.AppUserDetails;
import com.fintrack.entity.Users;
import com.fintrack.repository.UsersRepository;
import com.fintrack.service.CategoriesService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/** Categories: income/expense taxonomy. Global defaults (user=null) are readable by everyone. */
@RestController
@RequestMapping("/api/v1/categories")
public class CategoriesController {

  private final CategoriesService categoriesService;
  private final UsersRepository usersRepository;

  public CategoriesController(CategoriesService categoriesService, UsersRepository usersRepository) {
    this.categoriesService = categoriesService;
    this.usersRepository = usersRepository;
  }

  private Users currentUser(AppUserDetails details) {
    return usersRepository.getReferenceById(details.getUserId());
  }

  @GetMapping
  public Page<CategoryDto> list(@AuthenticationPrincipal AppUserDetails details,
                                @RequestParam(required = false) CategoryType type,
                                @PageableDefault(size = 50, sort = "name") Pageable pageable) {
    return categoriesService.listCategories(currentUser(details), type, pageable);
  }

  @GetMapping("/{id}")
  public CategoryDto get(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id) {
    return categoriesService.getCategory(currentUser(details), id);
  }

  @PostMapping
  public ResponseEntity<CategoryDto> create(@AuthenticationPrincipal AppUserDetails details,
                                            @Valid @RequestBody CategoryCreateRequest req) {
    CategoryDto dto = categoriesService.createCategory(currentUser(details), req);
    return ResponseEntity.created(URI.create("/api/v1/categories/" + dto.categoryId())).body(dto);
  }

  @PutMapping("/{id}")
  public CategoryDto update(@AuthenticationPrincipal AppUserDetails details, @PathVariable Long id,
                            @Valid @RequestBody CategoryUpdateRequest req) {
    return categoriesService.updateCategory(currentUser(details), id, req);
  }

  @PatchMapping("/{id}/archive")
  public ResponseEntity<Void> archive(@AuthenticationPrincipal AppUserDetails details,
                                      @PathVariable Long id) {
    categoriesService.archiveCategory(currentUser(details), id);
    return ResponseEntity.noContent().build();
  }
}
