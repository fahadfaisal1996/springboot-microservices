import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-wrapper animate-fade-in">
      <div class="glass-panel auth-card">
        <div class="auth-header">
          <div class="icon-circle"><i class="fa-solid fa-lock"></i></div>
          <h2>Welcome Back</h2>
          <p class="subtitle">Log in to access your microservices workspace</p>
        </div>

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

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label" for="username">Username or Email</label>
            <input 
              type="text" 
              id="username" 
              name="usernameOrEmail" 
              class="form-control" 
              [(ngModel)]="credentials.usernameOrEmail" 
              required 
              placeholder="e.g. admin or user@cloud.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="form-control" 
              [(ngModel)]="credentials.password" 
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" [disabled]="!loginForm.form.valid || loading" class="btn btn-primary btn-full">
            @if (loading) {
              <i class="fa-solid fa-spinner fa-spin"></i> Authenticating...
            } @else {
              Sign In <i class="fa-solid fa-arrow-right"></i>
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Create Account</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 120px);
      padding: 2rem;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
    }
    .auth-header {
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
    .auth-header h2 {
      font-size: 1.75rem;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .btn-full {
      width: 100%;
      margin-top: 1rem;
      padding: 0.85rem;
    }
    .auth-footer {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .auth-footer a {
      color: var(--accent-secondary);
      text-decoration: none;
      font-weight: 600;
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
export class LoginComponent {
  credentials = { usernameOrEmail: '', password: '' };
  loading = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/products';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/products';
    if (this.route.snapshot.queryParams['registered'] === 'true') {
      this.successMessage = 'Registration successful! Please log in.';
    }
  }

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.loading = false;
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Invalid credentials or Auth Service offline.';
        }
      }
    });
  }
}
