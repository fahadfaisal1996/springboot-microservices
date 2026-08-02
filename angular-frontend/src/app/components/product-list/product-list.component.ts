import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container animate-fade-in">
      <!-- Hero Banner -->
      <div class="hero-section glass-panel">
        <div class="hero-content">
          <span class="hero-chip"><i class="fa-solid fa-layer-group"></i> Microservice Architecture</span>
          <h1>Product Catalog</h1>
          <p>Real-time dataset fetched via <strong>Spring Cloud API Gateway</strong> &amp; protected by <strong>Spring Security 6 JWT</strong>.</p>
        </div>
        <div class="hero-stats">
          <div class="stat-card">
            <span class="stat-label">Gateway Status</span>
            <span class="stat-value text-success"><i class="fa-solid fa-circle-check"></i> Connected</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Active Role</span>
            <span class="stat-value text-accent">
              <i class="fa-solid" [class.fa-shield-halved]="authService.isAdmin()" [class.fa-user]="!authService.isAdmin()"></i>
              {{ authService.isAdmin() ? 'ROLE_ADMIN' : 'ROLE_USER' }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Products</span>
            <span class="stat-value">{{ products.length }}</span>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Bar -->
      <div class="filter-bar">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            placeholder="Search products by name, category, description..." 
            [(ngModel)]="searchQuery" 
            (input)="filterProducts()"
            class="form-control search-input"
          />
        </div>

        <div class="category-pills">
          <button 
            class="pill-btn" 
            [class.active]="selectedCategory === 'ALL'" 
            (click)="selectCategory('ALL')"
          >All</button>
          @for (cat of categories; track cat) {
            <button 
              class="pill-btn" 
              [class.active]="selectedCategory === cat" 
              (click)="selectCategory(cat)"
            >{{ cat }}</button>
          }
        </div>

        @if (authService.isAdmin()) {
          <a routerLink="/admin/create-product" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> New Product
          </a>
        }
      </div>

      <!-- Alert Messages -->
      @if (errorMessage) {
        <div class="alert alert-danger">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ errorMessage }}
        </div>
      }
      @if (successMessage) {
        <div class="alert alert-success">
          <i class="fa-solid fa-circle-check"></i> {{ successMessage }}
        </div>
      }

      <!-- Angular 18 @defer Block for Lazy Rendering -->
      @defer (on timer(100ms)) {
        @if (!loading && filteredProducts.length > 0) {
          <div class="product-grid">
            @for (product of filteredProducts; track product.id) {
              <div class="glass-panel product-card">
                <div class="card-header">
                  <span class="category-badge">{{ product.category }}</span>
                  <span class="stock-tag" [class.in-stock]="product.stockQuantity > 0" [class.out-stock]="product.stockQuantity === 0">
                    <i class="fa-solid" [class.fa-check]="product.stockQuantity > 0" [class.fa-xmark]="product.stockQuantity === 0"></i>
                    {{ product.stockQuantity > 0 ? product.stockQuantity + ' in stock' : 'Out of Stock' }}
                  </span>
                </div>

                <h3 class="product-title">{{ product.name }}</h3>
                <p class="product-desc">{{ product.description }}</p>

                <div class="card-footer">
                  <div class="price-tag">
                    <span class="currency">$</span>{{ product.price.toFixed(2) }}
                  </div>

                  @if (authService.isAdmin()) {
                    <button (click)="deleteProduct(product.id!)" class="btn btn-danger btn-sm" title="Delete Product (Admin Only)">
                      <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @placeholder {
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Loading Product Catalog...</p>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && filteredProducts.length === 0) {
        <div class="glass-panel empty-state">
          <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
          <h3>No Products Found</h3>
          <p>Try adjusting your search criteria or add new products as an admin.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .hero-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .hero-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--accent-secondary);
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.25);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      margin-bottom: 0.5rem;
    }
    .hero-content h1 {
      font-size: 2.2rem;
      margin-bottom: 0.35rem;
    }
    .hero-content p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .hero-stats {
      display: flex;
      gap: 1rem;
    }
    .stat-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.2rem;
    }
    .stat-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .text-success { color: var(--status-success); }
    .text-accent { color: var(--accent-secondary); }

    .filter-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
    }
    .search-input {
      padding-left: 2.75rem;
    }
    .category-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .pill-btn {
      padding: 0.5rem 1rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn:hover, .pill-btn.active {
      background: var(--accent-primary);
      color: #fff;
      border-color: var(--accent-primary);
    }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .product-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .category-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent-secondary);
      background: rgba(6, 182, 212, 0.12);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }
    .stock-tag {
      font-size: 0.75rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .in-stock { color: var(--status-success); }
    .out-stock { color: var(--status-danger); }

    .product-title {
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }
    .product-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      flex-grow: 1;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }
    .price-tag {
      font-family: var(--font-heading);
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
    }
    .currency {
      color: var(--accent-secondary);
      font-size: 1rem;
    }
    .btn-sm {
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted);
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--accent-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }
    .empty-icon {
      font-size: 3rem;
      color: var(--text-dim);
      margin-bottom: 1rem;
    }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
  `]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];

  searchQuery = '';
  selectedCategory = 'ALL';
  loading = true;
  errorMessage = '';
  successMessage = '';

  constructor(
    private productService: ProductService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.categories = Array.from(new Set(data.map(p => p.category)));
        this.filterProducts();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Authorization error: Please log in again to access Product Service.';
        } else {
          this.errorMessage = 'Failed to load products. Ensure API Gateway (Port 8080) and Product Service (Port 8082) are running.';
        }
      }
    });
  }

  filterProducts(): void {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = 
        this.selectedCategory === 'ALL' || product.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }

  deleteProduct(id: number): void {
    if (!confirm('Are you sure you want to delete this product? (Requires ROLE_ADMIN permission)')) {
      return;
    }

    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.successMessage = 'Product deleted successfully!';
        this.loadProducts();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        if (err.status === 403) {
          this.errorMessage = 'Access Denied: Only users with ROLE_ADMIN can delete products.';
        } else {
          this.errorMessage = 'Failed to delete product.';
        }
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }
}
