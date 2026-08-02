# Topic 7: Angular Frontend Integration (Interceptor, Guards & Signals)

---

## ❓ How Does Angular Connect to Spring Boot Microservices?

The Angular frontend application (`angular-frontend`) interacts exclusively with the **Spring Cloud API Gateway** (`http://localhost:8080`).

Key integration features built into our Angular app:
1. **`jwtInterceptor`**: Intercepts every outgoing HTTP request and automatically attaches `Authorization: Bearer <token>`.
2. **`authGuard` & `adminGuard`**: Protects client-side Angular routes from unauthorized user navigation.
3. **RxJS Signals (`AuthService`)**: Reactive state management tracking the logged-in user and role.

---

## 🏗️ Angular Request Flow

```
User Click Action -> Angular Component
                            |
                            v
                    ProductService
                            |
                   HttpClient Request
                            |
                            v
                     jwtInterceptor
      (Reads JWT from localStorage -> Attaches Header)
                            |
             Header: Authorization: Bearer <JWT>
                            v
               API Gateway (http://localhost:8080)
                            |
                            v
                   Product Microservice
```

---

## 💻 Code Implementation in Our Project

### 1. HTTP Interceptor (`jwtInterceptor`)

In [`jwt.interceptor.ts`](file:///c:/SpringBoot/angular-frontend/src/app/interceptors/jwt.interceptor.ts):

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Angular 18 Functional HTTP Interceptor
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken(); // Retrieve JWT token from localStorage

  // If a JWT token exists in localStorage, clone request and add Bearer header
  if (token) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(clonedReq); // Pass cloned request with Authorization header
  }

  return next(req); // Pass original request if unauthenticated
};
```

---

### 2. Angular Router Guards (`authGuard` & `adminGuard`)

In [`auth.guard.ts`](file:///c:/SpringBoot/angular-frontend/src/app/guards/auth.guard.ts):

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Functional CanActivate guard: Ensures user is logged in
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Permit route navigation
  }

  // Redirect unauthenticated user to login page with return URL query param
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false; // Block route navigation
};

// Functional CanActivate guard: Ensures user has ROLE_ADMIN authority
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true; // Permit admin route navigation
  }

  // Redirect unauthorized standard users to product list
  router.navigate(['/products']);
  return false; // Block route navigation
};
```

---

### 3. Route Configuration (`app.routes.ts`)

In [`app.routes.ts`](file:///c:/SpringBoot/angular-frontend/src/app/app.routes.ts):

```typescript
import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProductCreateComponent } from './components/product-create/product-create.component';
import { authGuard, adminGuard } from './guards/auth.guard';

// Application client-side routes definition
export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductListComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Admin-only route protected by BOTH authGuard (logged in) AND adminGuard (ROLE_ADMIN)
  { path: 'admin/create-product', component: ProductCreateComponent, canActivate: [authGuard, adminGuard] },
  
  { path: '**', redirectTo: 'products' } // Wildcard fallback
];
```

---

## 🔍 Key Concepts & Takeaways

1. **Functional Interceptors**: Angular 18 uses functional `HttpInterceptorFn` instead of class-based interceptors. Registered globally via `provideHttpClient(withInterceptors([jwtInterceptor]))` in `app.config.ts`.
2. **Signal State**: `AuthService` exposes `currentUserSignal = signal<User | null>(...)`. Navbar and components reactively render UI elements (like Admin badges or Delete buttons) without manual subscription lifecycle overhead.
3. **Decoupled Architecture**: Angular never communicates directly with ports 8081 or 8082. All requests target `http://localhost:8080/api/v1/...`, keeping client-side logic clean and API Gateway-centered.
