package com.fintrack.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fintrack.dto.CategoryCreateRequest;
import com.fintrack.dto.CategoryUpdateRequest;
import com.fintrack.entity.Categories;
import com.fintrack.entity.Users;
import com.fintrack.enums.CategoryType;
import com.fintrack.repository.CategoriesRepository;
import com.fintrack.repository.TransactionsRepository;
import com.fintrack.repository.UsersRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@Transactional
class CategoriesServiceTest {

  @Autowired CategoriesRepository categoriesRepository;
  @Autowired TransactionsRepository transactionsRepository;
  @Autowired UsersRepository usersRepository;

  CategoriesService service;
  Users user;

  @BeforeEach
  void setUp() {
    service = new CategoriesService(categoriesRepository, transactionsRepository);
    user = usersRepository.save(new Users("Nguyễn Văn B", "b@example.com", "hash"));
  }

  @Test
  void createUserAndGlobalCategories() {
    var c = service.createCategory(user,
        new CategoryCreateRequest("Ăn uống", CategoryType.EXPENSE, "ăn uống hàng ngày",
            "#F59E0B", "utensils"));
    assertThat(c.categoryId()).isNotNull();
    assertThat(c.categoryType()).isEqualTo(CategoryType.EXPENSE);

    var g = service.createCategory(null,
        new CategoryCreateRequest("Salary", CategoryType.INCOME, "lương", "#22C55E", "briefcase"));
    assertThat(g.categoryId()).isNotNull();

    var page = service.listCategories(user, CategoryType.EXPENSE, Pageable.unpaged());
    assertThat(page.getContent()).extracting(com.fintrack.dto.CategoryDto::name)
        .contains("Ăn uống");
  }

  @Test
  void duplicateNamePerUserAndTypeRejected() {
    service.createCategory(user, new CategoryCreateRequest("Ăn uống", CategoryType.EXPENSE,
        null, "#F59E0B", "utensils"));
    assertThatThrownBy(() -> service.createCategory(user,
        new CategoryCreateRequest("Ăn uống", CategoryType.EXPENSE, null, "#F59E0B", "utensils")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void sameNameDifferentTypeAllowed() {
    service.createCategory(user, new CategoryCreateRequest("Salary", CategoryType.INCOME,
        null, "#22C55E", "briefcase"));
    service.createCategory(user, new CategoryCreateRequest("Salary", CategoryType.EXPENSE,
        null, "#F59E0B", "utensils"));
  }

  @Test
  void invalidColorRejected() {
    assertThatThrownBy(() -> service.createCategory(user,
        new CategoryCreateRequest("X", CategoryType.EXPENSE, null, "not-a-color", "utensils")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void archiveOnlyOwnCategory() {
    var c = service.createCategory(user, new CategoryCreateRequest("Old",
        CategoryType.EXPENSE, null, null, null));
    service.archiveCategory(user, c.categoryId());
    Categories archived = categoriesRepository.findById(c.categoryId()).get();
    assertThat(archived.getIsArchived()).isTrue();
  }

  @Test
  void globalCategoryNotEditableByUser() {
    var g = service.createCategory(null,
        new CategoryCreateRequest("Global", CategoryType.INCOME, null, null, null));
    assertThatThrownBy(() -> service.updateCategory(user, g.categoryId(),
        new CategoryUpdateRequest("Renamed", null, null, null)))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
