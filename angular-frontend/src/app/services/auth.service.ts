import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/v1/auth';
  
  public currentUserSignal = signal<User | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  public get currentUser(): User | null {
    return this.currentUserSignal();
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    this.currentUserSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.currentUserSignal();
    return user?.role === 'ROLE_ADMIN';
  }

  private handleAuthResponse(res: AuthResponse): void {
    localStorage.setItem('jwt_token', res.token);
    const user: User = {
      username: res.username,
      email: res.email,
      role: res.role,
      token: res.token
    };
    localStorage.setItem('user_info', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private getStoredUser(): User | null {
    const data = localStorage.getItem('user_info');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
