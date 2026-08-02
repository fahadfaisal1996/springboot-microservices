import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container animate-fade-in">
      <div class="form-wrapper">
        <div class="glass-panel form-card">
          <div class="form-header">
            <div class="icon-circle"><i class="fa-solid fa-plus"></i></div>
            <h2>Create New Product</h2>
            <p class="subtitle">Admin Endpoint: Protected by <code>ROLE_ADMIN</code> authorization requirement</p>
          </div>

          @if (errorMessage) {
            <div class="alert alert-danger">
              <i class="fa-solid fa-triangle-exclamation"></i> {{ errorMessage }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" #productForm="ngForm">
            <div class="form-group">
              <label class="form-label" for="name">Product Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                class="form-control" 
                [(ngModel)]="product.name" 
                required 
                placeholder="e.g. 4K Ultra HD Monitor"
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="category">Category</label>
                <input 
                  type="text" 
                  id="category" 
                  name="category" 
                  class="form-control" 
                  [(ngModel)]="product.category" 
                  required 
                  placeholder="e.g. Electronics"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="price">Price ($)</label>
                <input 
                  type="number" 
                  id="price" 
                  name="price" 
                  class="form-control" 
                  [(ngModel)]="product.price" 
                  required 
                  min="0.01"
                  step="0.01"
                  placeholder="299.99"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="stockQuantity">Stock Quantity</label>
                <input 
                  type="number" 
                  id="stockQuantity" 
                  name="stockQuantity" 
                  class="form-control" 
                  [(ngModel)]="product.stockQuantity" 
                  required 
                  min="0"
                  placeholder="10"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="description">Description</label>
              <textarea 
                id="description" 
                name="description" 
                class="form-control" 
                rows="4" 
                [(ngModel)]="product.description" 
                placeholder="Detailed specifications and feature highlights..."
              ></textarea>
            </div>

            <div class="actions">
              <a routerLink="/products" class="btn btn-secondary">Cancel</a>
              <button type="submit" [disabled]="!productForm.form.valid || loading" class="btn btn-primary">
                @if (loading) {
                  <i class="fa-solid fa-spinner fa-spin"></i> Saving...
                } @else {
                  <i class="fa-solid fa-check"></i> Save Product
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-wrapper {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
    }
    .form-card {
      width: 100%;
      max-width: 680px;
    }
    .form-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .icon-circle {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent-primary);
      border: 1px solid rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin: 0 auto 1rem;
    }
    .form-header h2 {
      font-size: 1.8rem;
      margin-bottom: 0.35rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .subtitle code {
      color: var(--accent-secondary);
      background: rgba(6, 182, 212, 0.12);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
  `]
})
export class ProductCreateComponent {
  product: Product = {
    name: '',
    description: '',
    price: 0,
    stockQuantity: 0,
    category: ''
  };
  loading = false;
  errorMessage = '';

  constructor(private productService: ProductService, private router: Router) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.productService.createProduct(this.product).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403) {
          this.errorMessage = 'Access Denied: Only users with ROLE_ADMIN authorization can create products.';
        } else if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Failed to create product. Check input parameters or gateway log.';
        }
      }
    });
  }
}
