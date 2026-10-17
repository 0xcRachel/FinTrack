package com.fintrack.service;

import com.fintrack.dto.CategoryDto;
import com.fintrack.dto.CategoryCreateRequest;
import com.fintrack.dto.CategoryUpdateRequest;
import com.fintrack.entity.Categories;
import com.fintrack.enums.CategoryType;
import com.fintrack.entity.Users;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.mapper.CategoryMapper;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Category business rules: unique (user, type, name); income vs expense types cannot mix. */
@Service
public class CategoriesService {

  private final CategoriesRepository categoriesRepository;
  private final TransactionsRepository transactionsRepository;

  public CategoriesService(CategoriesRepository categoriesRepository,
                           TransactionsRepository transactionsRepository) {
    this.categoriesRepository = categoriesRepository;
    this.transactionsRepository = transactionsRepository;
  }

  @Transactional(readOnly = true)
  public Page<CategoryDto> listCategories(Users user, CategoryType type, Pageable pageable) {
    return categoriesRepository.findAccessible(user, type, pageable)
        .map(c -> CategoryMapper.toDto(c, null, null));
  }

  @Transactional(readOnly = true)
  public CategoryDto getCategory(Users user, Long categoryId) {
    Categories c = categoriesRepository.findById(categoryId)
        .filter(cat -> cat.getIsArchived() == false
            && (cat.getUser() == null
                || cat.getUser().getUserId().equals(user.getUserId())))
        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    return CategoryMapper.toDto(c, null, null);
  }

  @Transactional
  public CategoryDto createCategory(Users user, CategoryCreateRequest req) {
    validateColor(req.colorHex());
    if (user != null) {
      if (categoriesRepository.existsByUserAndNameAndCategoryTypeAndIsArchivedFalse(
              user, req.name(), req.categoryType())) {
        throw new IllegalArgumentException("A category with this name already exists");
      }
    } else if (categoriesRepository.existsByNameAndCategoryTypeAndIsArchivedFalse(
            req.name(), req.categoryType())) {
      throw new IllegalArgumentException("A category with this name already exists");
    }
    Categories c = new Categories(user, req.name(), req.categoryType(), req.description(),
        req.colorHex(), req.iconName());
    return CategoryMapper.toDto(categoriesRepository.save(c), null, null);
  }

  @Transactional
  public CategoryDto updateCategory(Users user, Long categoryId, CategoryUpdateRequest req) {
    Categories c = categoriesRepository.findById(categoryId)
        .filter(cat -> cat.getIsArchived() == false
            && cat.getUser() != null
            && cat.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Category not found or not editable"));
    if (req.name() != null && !req.name().equals(c.getName())
        && categoriesRepository.existsByUserAndNameAndCategoryTypeAndIsArchivedFalse(
            user, req.name(), c.getCategoryType())) {
      throw new IllegalArgumentException("A category with this name already exists");
    }
    if (req.name() != null) c.setName(req.name());
    if (req.description() != null) c.setDescription(req.description());
    if (req.colorHex() != null) { validateColor(req.colorHex()); c.setColorHex(req.colorHex()); }
    if (req.iconName() != null) c.setIconName(req.iconName());
    return CategoryMapper.toDto(categoriesRepository.save(c), null, null);
  }

  @Transactional
  public void archiveCategory(Users user, Long categoryId) {
    Categories c = categoriesRepository.findById(categoryId)
        .filter(cat -> cat.getUser() != null
            && cat.getUser().getUserId().equals(user.getUserId()))
        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    c.setIsArchived(true);
    categoriesRepository.save(c);
  }

  private void validateColor(String color) {
    if (color != null && !color.matches("^#[0-9A-Fa-f]{6}$")) {
      throw new IllegalArgumentException("Color must be a hex code like #22C55E");
    }
  }
}
