package com.fintrack.entity;

import java.time.Instant;
import com.fintrack.enums.CategoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** Category for income or expense transactions. Optional userId -> global default when null. */
@Entity
@Table(name = "Categories")
public class Categories {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "CategoryId")
  private Long categoryId;

  @ManyToOne(optional = true)
  @JoinColumn(name = "UserId")
  private Users user;

  @Column(name = "Name", nullable = false, length = 100)
  private String name;

  @Column(name = "CategoryType", nullable = false, length = 20)
  @Enumerated(EnumType.STRING)
  private CategoryType categoryType;

  @Column(name = "Description", length = 500)
  private String description;

  @Column(name = "ColorHex", length = 7)
  private String colorHex;

  @Column(name = "IconName", length = 50)
  private String iconName;

  @Column(name = "IsArchived", nullable = false)
  private Boolean isArchived = false;

  @Column(name = "CreatedAt", nullable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "UpdatedAt", nullable = false)
  private Instant updatedAt = Instant.now();

  @Version
  @Column(name = "Version")
  private Long version;

  protected Categories() {}

  public Categories(Users user, String name, CategoryType categoryType,
                    String description, String colorHex, String iconName) {
    this.user = user;
    this.name = name;
    this.categoryType = categoryType;
    this.description = description;
    this.colorHex = colorHex;
    this.iconName = iconName;
  }

  // getters / setters
  public Long getCategoryId() { return categoryId; }
  public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
  public Users getUser() { return user; }
  public void setUser(Users user) { this.user = user; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public CategoryType getCategoryType() { return categoryType; }
  public void setCategoryType(CategoryType categoryType) { this.categoryType = categoryType; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getColorHex() { return colorHex; }
  public void setColorHex(String colorHex) { this.colorHex = colorHex; }
  public String getIconName() { return iconName; }
  public void setIconName(String iconName) { this.iconName = iconName; }
  public Boolean getIsArchived() { return isArchived; }
  public void setIsArchived(Boolean isArchived) { this.isArchived = isArchived; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Long getVersion() { return version; }
  public void setVersion(Long version) { this.version = version; }
}
