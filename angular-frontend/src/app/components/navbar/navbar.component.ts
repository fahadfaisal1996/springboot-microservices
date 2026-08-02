import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationRecord } from '../../models/notification.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar">
      <div class="nav-container">
        <a routerLink="/" class="nav-brand">
          <div class="brand-icon"><i class="fa-solid fa-cubes"></i></div>
          <span class="brand-name">CloudStore <span class="brand-badge">Microservices</span></span>
        </a>

        <div class="nav-links">
          <a routerLink="/products" routerLinkActive="active" class="nav-item">
            <i class="fa-solid fa-store"></i> Products
          </a>
          @if (authService.isAdmin()) {
            <a routerLink="/admin/create-product" routerLinkActive="active" class="nav-item">
              <i class="fa-solid fa-plus-circle"></i> Add Product
            </a>
          }
        </div>

        <div class="nav-auth">
          <!-- Kafka Notification Dropdown -->
          <div class="notification-dropdown">
            <button (click)="toggleNotifications()" class="nav-item notif-btn" title="Kafka Event Notifications">
              <i class="fa-solid fa-bell"></i>
              @if (notifications.length > 0) {
                <span class="notif-badge">{{ notifications.length }}</span>
              }
            </button>

            @if (showDropdown) {
              <div class="glass-panel dropdown-menu animate-fade-in">
                <div class="dropdown-header">
                  <i class="fa-solid fa-bolt text-accent"></i> Kafka Event Stream Notifications
                </div>
                <div class="dropdown-body">
                  @if (notifications.length === 0) {
                    <p class="empty-notif">No new notifications from Notification Service</p>
                  }
                  @for (n of notifications; track n.id) {
                    <div class="notif-item">
                      <div class="notif-channel"><i class="fa-solid fa-envelope"></i> {{ n.channel }}</div>
                      <div class="notif-msg">{{ n.message }}</div>
                      <div class="notif-time">{{ n.timestamp | date:'shortTime' }}</div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          @if (authService.currentUserSignal(); as user) {
            <div class="user-profile">
              <span class="user-badge" [class.badge-admin]="user.role === 'ROLE_ADMIN'" [class.badge-user]="user.role === 'ROLE_USER'">
                <i class="fa-solid" [class.fa-shield-halved]="user.role === 'ROLE_ADMIN'" [class.fa-user]="user.role === 'ROLE_USER'"></i>
                {{ user.role === 'ROLE_ADMIN' ? 'Admin' : 'User' }}
              </span>
              <span class="username">{{ user.username }}</span>
              <button (click)="logout()" class="btn btn-secondary btn-sm" title="Log Out">
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          } @else {
            <a routerLink="/login" class="btn btn-secondary btn-sm">Log In</a>
            <a routerLink="/register" class="btn btn-primary btn-sm">Register</a>
          }
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-main);
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: #fff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .brand-name {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
    }
    .brand-badge {
      font-size: 0.75rem;
      color: var(--accent-secondary);
      font-weight: 500;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .nav-item {
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .nav-item:hover, .nav-item.active {
      color: var(--accent-primary);
    }
    .nav-auth {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .notification-dropdown {
      position: relative;
    }
    .notif-btn {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--border-color);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      position: relative;
    }
    .notif-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: var(--status-danger);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
    }
    .dropdown-menu {
      position: absolute;
      right: 0;
      top: 45px;
      width: 320px;
      max-height: 380px;
      overflow-y: auto;
      padding: 1rem;
      z-index: 200;
    }
    .dropdown-header {
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    .notif-item {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      padding: 0.6rem;
      border-radius: 6px;
      margin-bottom: 0.5rem;
    }
    .notif-channel {
      font-size: 0.7rem;
      color: var(--accent-secondary);
      font-weight: 600;
    }
    .notif-msg {
      font-size: 0.82rem;
      color: var(--text-main);
      margin: 0.2rem 0;
    }
    .notif-time {
      font-size: 0.7rem;
      color: var(--text-dim);
      text-align: right;
    }
    .empty-notif {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-align: center;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(30, 41, 59, 0.6);
      padding: 0.35rem 0.75rem 0.35rem 0.5rem;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
    }
    .username {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-main);
    }
    .btn-sm {
      padding: 0.4rem 0.9rem;
      font-size: 0.85rem;
    }
  `]
})
export class NavbarComponent implements OnInit {
  notifications: NotificationRecord[] = [];
  showDropdown = false;

  constructor(
    public authService: AuthService, 
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    this.notifService.getNotifications().subscribe({
      next: (data) => this.notifications = data,
      error: () => {}
    });
  }

  toggleNotifications(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.fetchNotifications();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
