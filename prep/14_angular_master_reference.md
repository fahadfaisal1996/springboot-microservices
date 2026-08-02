# Topic 14: Modern Angular 18 Master Reference Guide

---

## 📚 Overview

This reference guide covers modern **Angular 18+ Architecture**, component lifecycle hooks, core decorators, functional interceptors/guards, RxJS signals, deferrable views, and control-flow syntax—with exact code examples directly from our [`angular-frontend`](file:///c:/SpringBoot/angular-frontend) project.

---

## 🔄 1. Component Lifecycle Hooks

Angular manages component lifecycles from creation through destruction.

| Lifecycle Hook | When Called | Primary Use Case in Our Project |
|---|---|---|
| **`ngOnChanges`** | When `@Input()` bound properties change | Responding to dynamic input data changes. |
| **`ngOnInit`** | Once after component initialization & inputs set | Fetching initial HTTP data (e.g. loading products or notifications). |
| **`ngDoCheck`** | During every change detection run | Custom change detection logic (rarely needed with Signals). |
| **`ngAfterViewInit`**| After component view and child views initialize | DOM element queries (`@ViewChild`) & chart rendering. |
| **`ngOnDestroy`** | Immediately before component destruction | Unsubscribing from RxJS Observables to prevent memory leaks. |
| **`afterNextRender`** | (Angular 17+) Once after next DOM paint | DOM measurements and SSR hydration logic. |

### 💻 Code Example (`ProductListComponent`):
In [`product-list.component.ts`](file:///c:/SpringBoot/angular-frontend/src/app/components/product-list/product-list.component.ts):
```typescript
export class ProductListComponent implements OnInit {
  products: Product[] = [];

  constructor(private productService: ProductService) {}

  // ngOnInit lifecycle hook triggers HTTP request via API Gateway on component load
  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => { this.products = data; }
    });
  }
}
```

---

## 🏷️ 2. Core Angular Decorators

Decorators attach metadata to classes, properties, and parameters.

| Decorator | Target | Purpose & Project Usage |
|---|---|---|
| **`@Component()`** | Class | Defines HTML template, CSS styles, and standalone metadata. |
| **`@Injectable()`**| Class | Marks a class as a dependency-injectable service (`providedIn: 'root'`). |
| **`@Input()`** | Property | Receives data passed from parent component. |
| **`@Output()`** | Property | Emits events to parent component via `EventEmitter`. |
| **`@HostListener()`**| Method | Listens to browser events (clicks, keypresses, window resizes). |
| **`@ViewChild()`** | Property | References a DOM template element or child component instance. |

### 💻 Code Example (`AuthService`):
In [`auth.service.ts`](file:///c:/SpringBoot/angular-frontend/src/app/services/auth.service.ts):
```typescript
@Injectable({
  providedIn: 'root' // Singleton service injected application-wide
})
export class AuthService {
  // Service implementation
}
```

---

## ⚡ 3. Angular 18 Functional Interceptors & Guards

Angular 18 deprecates class-based interceptors and guards in favor of lightweight, functional patterns (`HttpInterceptorFn`, `CanActivateFn`).

### A. Functional JWT Interceptor (`jwtInterceptor`)
In [`jwt.interceptor.ts`](file:///c:/SpringBoot/angular-frontend/src/app/interceptors/jwt.interceptor.ts):
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Functional interceptor automatically clones requests and appends Bearer token
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  }

  return next(req);
};
```

### B. Functional Route Guards (`authGuard` & `adminGuard`)
In [`auth.guard.ts`](file:///c:/SpringBoot/angular-frontend/src/app/guards/auth.guard.ts):
```typescript
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Protects routes requiring active JWT login session
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};

// Protects routes requiring ROLE_ADMIN privilege
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }
  router.navigate(['/products']);
  return false;
};
```

---

## 🚀 4. Latest Angular 18 Features Used in Our Project

### A. Standalone Components Architecture
No `NgModule` declaration files required! Components declare imports directly in `@Component`.

In [`app.config.ts`](file:///c:/SpringBoot/angular-frontend/src/app/app.config.ts):
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};
```

---

### B. RxJS Signals (`signal`, `computed`, `effect`)
Signals provide fine-grained reactivity without Zone.js change-detection overhead.

In [`auth.service.ts`](file:///c:/SpringBoot/angular-frontend/src/app/services/auth.service.ts):
```typescript
// Signal state tracking currentUser reactive value
currentUser = signal<User | null>(this.getUserFromStorage());

// Computed signal automatically deriving isLoggedIn state
isLoggedIn = computed(() => this.currentUser() !== null);

// Computed signal deriving admin authority
isAdmin = computed(() => this.currentUser()?.role === 'ROLE_ADMIN');
```

---

### C. Deferrable Views (`@defer`)
Defers template initialization until triggered by timers, viewports, or user interaction.

In [`product-list.component.ts`](file:///c:/SpringBoot/angular-frontend/src/app/components/product-list/product-list.component.ts):
```html
@defer (on timer(100ms)) {
  <div class="product-grid">
    @for (product of filteredProducts; track product.id) {
      <div class="glass-panel product-card">
        <!-- Render product details -->
      </div>
    }
  </div>
} @placeholder {
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading Product Catalog...</p>
  </div>
}
```

---

### D. Built-In Control Flow (`@if`, `@for`, `@switch`)
Replaces `*ngIf` and `*ngFor` with clean, native compiler syntax.

```html
@if (authService.isAdmin()) {
  <button class="btn btn-primary">Create Product</button>
}

@for (notification of notifications(); track notification.timestamp) {
  <div class="notification-item">{{ notification.message }}</div>
} @empty {
  <p>No notifications</p>
}
```

---

### E. Global Client Error Handler (`GlobalErrorHandler`)
In [`global-error.handler.ts`](file:///c:/SpringBoot/angular-frontend/src/app/handlers/global-error.handler.ts):
```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error.message ? error.message : error.toString();
    console.error('[Global ErrorHandler Caught Exception]:', message, error);
  }
}
```
